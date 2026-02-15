import { serve } from "https://esm.sh/@std/http@0.177.0/server";
import Stripe from "npm:stripe@^14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const { creatorId, tierId, paymentMethodId } = await req.json();

    // 1. Customer ID holen/erstellen
    const { data: profile } = await supabase.from("users").select("stripe_customer_id").eq("id", user.id).single();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email, metadata: { supabase_uid: user.id } });
      customerId = c.id;
      const sa = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await sa.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // 2. Preis ermitteln
    let priceAmount = 0;
    let priceName = "Abonnement";
    let productMetadataId = `creator_${creatorId}`;

    if (tierId) {
      const { data: tier } = await supabase.from("subscription_tiers").select("*").eq("id", tierId).single();
      if (!tier) throw new Error("Tier nicht gefunden");
      priceAmount = Math.round(tier.price * 100);
      priceName = `${tier.name} - Abo`;
      productMetadataId = `tier_${tierId}`;
    } else {
      const { data: creator } = await supabase.from("users").select("subscription_price, display_name").eq("id", creatorId).single();
      if (!creator) throw new Error("Creator nicht gefunden");
      priceAmount = Math.round(creator.subscription_price * 100);
      priceName = `Abo für ${creator.display_name}`;
    }

    const lookupKey = `${productMetadataId}_${priceAmount}`;
    let targetPriceId;
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });

    if (prices.data.length > 0) {
      targetPriceId = prices.data[0].id;
    } else {
      const product = await stripe.products.create({ name: priceName, metadata: { creator_id: creatorId, tier_id: tierId || 'base' } });
      const price = await stripe.prices.create({ unit_amount: priceAmount, currency: 'eur', recurring: { interval: 'month' }, product: product.id, lookup_key: lookupKey });
      targetPriceId = price.id;
    }

    // 3. Prüfen, ob es bereits ein Abo gibt (DB)
    const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('fan_id', user.id)
        .eq('creator_id', creatorId)
        .neq('status', 'EXPIRED')
        .single();

    let stripeSubscription;
    let isUpgradeOrReactivation = false;

    if (existingSub && existingSub.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(existingSub.stripe_subscription_id);

        if (sub.status !== 'canceled') {
          isUpgradeOrReactivation = true;
          const currentItemId = sub.items.data[0].id;

          const updateParams: any = {
            cancel_at_period_end: false,
            metadata: {
              fan_id: user.id,
              creator_id: creatorId,
              tier_id: tierId || 'null'
            },
            // FIX: Diese Parameter fehlten beim Update, sind aber wichtig für 3D-Secure
            payment_behavior: 'allow_incomplete',
            expand: ['latest_invoice.payment_intent']
          };

          if (sub.items.data[0].price.id !== targetPriceId) {
            updateParams.items = [{
              id: currentItemId,
              price: targetPriceId,
            }];
            // FIX: 'always_invoice' berechnet die Differenz sofort!
            // Da wir das Item tauschen, bleibt der Zyklus erhalten,
            // aber Stripe erstellt eine Invoice über die Differenz (Proration).
            updateParams.proration_behavior = 'always_invoice';
          } else {
            // Reine Reaktivierung ohne Preisänderung -> keine Rechnung
            updateParams.proration_behavior = 'none';
          }

          if (paymentMethodId) {
            updateParams.default_payment_method = paymentMethodId;
          }

          stripeSubscription = await stripe.subscriptions.update(existingSub.stripe_subscription_id, updateParams);
        }
      } catch (e) {
        console.log("Existing subscription not found in Stripe or error:", e);
      }
    }

    // 4. Neues Abo erstellen (Fallback)
    if (!isUpgradeOrReactivation) {
      const metadataObj = {
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: tierId || 'null'
      };

      const subscriptionParams: any = {
        customer: customerId,
        items: [{ price: targetPriceId }],
        payment_behavior: 'allow_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: metadataObj
      };

      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      stripeSubscription = await stripe.subscriptions.create(subscriptionParams);
    }

    // Response vorbereiten
    // Sicherstellen, dass wir das PaymentIntent erwischen, egal ob Create oder Update
    let paymentIntent = null;
    if (stripeSubscription.latest_invoice && typeof stripeSubscription.latest_invoice === 'object') {
      paymentIntent = (stripeSubscription.latest_invoice as any).payment_intent;
    }

    // Fehlergrund extrahieren, falls vorhanden
    let errorMessage = null;
    if (paymentIntent?.last_payment_error) {
      errorMessage = paymentIntent.last_payment_error.message;
    }

    return new Response(JSON.stringify({
      subscriptionId: stripeSubscription.id,
      clientSecret: paymentIntent?.client_secret || null,
      status: stripeSubscription.status,
      paymentIntentStatus: paymentIntent?.status || null,
      errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Create/Update Subscription Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});