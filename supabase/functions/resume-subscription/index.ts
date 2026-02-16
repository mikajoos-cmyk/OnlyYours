// supabase/functions/resume-subscription/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY server config missing')

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )

    // Service Role Client für DB-Updates
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Nicht authentifiziert')

    const { subscriptionId } = await req.json()
    if (!subscriptionId) throw new Error('Subscription ID fehlt')

    // 1. Daten holen
    const { data: subData, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id, fan_id')
        .eq('id', subscriptionId)
        .single()

    if (subError || !subData) throw new Error('Abo nicht in DB gefunden')
    if (subData.fan_id !== user.id) throw new Error('Keine Berechtigung')
    if (!subData.stripe_subscription_id) throw new Error('Keine Stripe-ID verknüpft')

    // 2. Stripe Update
    console.log(`[Resume] Stripe Update für: ${subData.stripe_subscription_id}`)
    const updatedStripeSub = await stripe.subscriptions.update(
        subData.stripe_subscription_id,
        { cancel_at_period_end: false }
    )

    // 3. DB Update
    const correctEndDate = new Date(updatedStripeSub.current_period_end * 1000).toISOString()
    console.log(`[Resume] Schreibe neues Enddatum in DB: ${correctEndDate}`)

    const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          auto_renew: true,
          status: 'ACTIVE',
          end_date: correctEndDate
        })
        .eq('id', subscriptionId)
        .select() // WICHTIG: Gibt die geänderten Daten zurück!
        .single()

    if (updateError) {
      console.error('[Resume] DB Update FEHLGESCHLAGEN:', updateError)
      // Wir werfen hier einen Fehler, damit das Frontend weiß, dass die Daten inkonsistent sind
      throw new Error('Datenbank-Update fehlgeschlagen: ' + updateError.message)
    }

    console.log('[Resume] DB Update erfolgreich:', updatedRecord)

    return new Response(
        JSON.stringify({
          success: true,
          message: 'Abo reaktiviert',
          subscription: updatedStripeSub,
          dbRecord: updatedRecord
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('[Resume] Fehler:', error.message)
    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})