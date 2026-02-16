import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import Stripe from "npm:stripe@^14.25.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Supabase Client erstellen
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. User authentifizieren
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Nicht authentifiziert")

    // 3. Admin-Client für Zugriff auf stripe_account_id
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single()

    let accountId = profile?.stripe_account_id

    // --- FALL A: USER HAT BEREITS EINEN STRIPE ACCOUNT ---
    if (accountId) {
      // Wir erstellen einen Login-Link zum Express Dashboard
      // Dort kann der User seine Bankdaten (IBAN) ändern
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      return new Response(
          JSON.stringify({ url: loginLink.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- FALL B: USER HAT NOCH KEINEN ACCOUNT (NEU ERSTELLEN) ---
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'DE', // Könnte man auch aus dem User-Profil lesen oder als Parameter übergeben
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    accountId = account.id

    // ID in DB speichern
    await supabaseAdmin
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id)

    // Onboarding Link erstellen
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get('origin')}/payouts`,
      return_url: `${req.headers.get('origin')}/payouts?connected=true`,
      type: 'account_onboarding',
    })

    return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(error)
    return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})