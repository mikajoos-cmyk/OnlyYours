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

    const { paymentMethodId, amount, metadata, returnUrl } = await req.json();

    const { data: profile } = await supabase.from("users").select("stripe_customer_id").eq("id", user.id).single();
    const customerId = profile?.stripe_customer_id;

    if (!customerId) throw new Error("Kein Customer gefunden");

    // Zahlung erstellen
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      return_url: returnUrl || "https://example.com/return",
      // FIX: off_session: true nutzen, um das gespeicherte Mandat zu verwenden
      // Das verhindert den PayPal-Fehler mit der fehlenden risk_correlation_id
      off_session: true,
      metadata: { ...metadata, userId: user.id }
    });

    // Prüfen ob Action nötig ist (SCA / Redirect)
    if (['requires_action', 'requires_source_action'].includes(paymentIntent.status)) {
      return new Response(JSON.stringify({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, paymentIntentId: paymentIntent.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    // Spezialfall: Stripe wirft Error bei authentication_required oft direkt
    if (error.raw && error.raw.payment_intent) {
      return new Response(JSON.stringify({
        success: false,
        requiresAction: true,
        clientSecret: error.raw.payment_intent.client_secret
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.error("Charge Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});