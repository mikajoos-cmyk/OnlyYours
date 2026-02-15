import { serve } from "https://esm.sh/@std/http@0.177.0/server"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Nicht authentifiziert')

    const { subscriptionId, newTierId, newPrice } = await req.json()
    if (!subscriptionId) throw new Error('Subscription ID fehlt')

    // 1. Abo aus DB holen (wir brauchen die Stripe Subscription ID)
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: subData, error: dbError } = await supabaseAdmin
        .from('subscriptions')
        .select('stripe_subscription_id, fan_id')
        .eq('id', subscriptionId)
        .single();

    if (dbError || !subData) throw new Error('Abo nicht gefunden');
    if (subData.fan_id !== user.id) throw new Error('Nicht dein Abo');
    if (!subData.stripe_subscription_id) throw new Error('Keine Stripe ID verknüpft');

    // 2. Den neuen Stripe Price finden
    // Wir nutzen den lookup_key: "tier_{tierUUID}_{priceInCents}"
    // Achtung: Wenn newTierId null ist (Basis-Abo ohne Tier), brauchen wir eine andere Logik
    // oder einen "Basis-Preis". Hier nehme ich an, es gibt immer ein Tier oder Preis.
    // Wenn newTierId null ist, nehmen wir an, es ist das Basis-Abo des Creators.

    let targetPriceId = '';

    if (newTierId) {
      // Price in Cents
      const priceInCents = Math.round(newPrice * 100);
      const lookupKey = `tier_${newTierId}_${priceInCents}`;

      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        limit: 1
      });

      if (prices.data.length > 0) {
        targetPriceId = prices.data[0].id;
      } else {
        // Fallback: Preis existiert in Stripe noch nicht -> Fehler oder erstellen?
        // Wir werfen Fehler, da der Creator den Preis erstellt haben sollte
        throw new Error(`Preis nicht in Stripe gefunden (Key: ${lookupKey})`);
      }
    } else {
      // Logik für Basis-Abo ohne Tier (falls das in deinem Modell existiert)
      // Hier müsste man den Price anhand des Creators finden.
      // Vereinfachung: Wir werfen Fehler, wenn kein Tier gewählt ist,
      // es sei denn, du hast eine Logik für "Tier-loses" Abo.
      throw new Error("Tier ID wird für Wechsel benötigt.");
    }

    // 3. Aktuelles Subscription Item holen
    const stripeSub = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
    const itemId = stripeSub.items.data[0].id;

    // 4. Update bei Stripe durchführen
    const updatedStripeSub = await stripe.subscriptions.update(
        subData.stripe_subscription_id,
        {
          items: [{
            id: itemId,
            price: targetPriceId,
          }],
          proration_behavior: 'create_prorations', // Berechnet Differenz (Guthaben/Nachzahlung)
        }
    );

    return new Response(
        JSON.stringify({ success: true, data: updatedStripeSub }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error(error);
    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})