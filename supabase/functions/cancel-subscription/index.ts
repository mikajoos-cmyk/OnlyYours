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

    const { subscriptionId } = await req.json();

    const { data: subData } = await supabase.from('subscriptions').select('stripe_subscription_id, fan_id').eq('id', subscriptionId).single();
    if (!subData) throw new Error("Abo nicht gefunden");
    if (subData.fan_id !== user.id) throw new Error("Keine Berechtigung.");

    const stripeSubId = subData.stripe_subscription_id;

    if (stripeSubId) {
      await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
    }

    await supabase.from('subscriptions').update({ status: 'CANCELED', auto_renew: false }).eq('id', subscriptionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});



