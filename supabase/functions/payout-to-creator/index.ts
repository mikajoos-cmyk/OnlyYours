import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@^14.25.0";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount } = await req.json(); // Betrag in EUR

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 1. User authentifizieren
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Nicht authentifiziert");

    // 2. SICHERHEITS-CHECK: Guthaben prüfen
    // Wir nutzen die RPC-Funktion aus der Datenbank, die Einnahmen minus Auszahlungen rechnet
    const { data: summary, error: summaryError } = await supabaseAdmin
        .rpc('get_payout_summary', { creator_id_input: user.id })
        .single();

    if (summaryError || !summary) throw new Error("Konnte Guthaben nicht prüfen.");

    if (summary.available_balance < amount) {
      throw new Error(`Nicht genügend Guthaben. Verfügbar: ${summary.available_balance}€`);
    }

    // 3. Stripe Account ID holen
    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

    if (!profile?.stripe_account_id) {
      throw new Error("Kein Bankkonto verbunden.");
    }

    // 4. Transfer via Stripe
    const transferAmount = Math.round(amount * 100);
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'eur',
      destination: profile.stripe_account_id,
      description: `Auszahlung OnlyYours`
    });

    // 5. Transaktion in DB speichern
    await supabaseAdmin.from('payouts').insert({
      creator_id: user.id,
      amount: amount,
      status: 'COMPLETED',
      payout_method: 'STRIPE_CONNECT',
      completed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: true,
      transferId: transfer.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});