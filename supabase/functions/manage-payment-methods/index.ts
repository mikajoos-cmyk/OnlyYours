import { serve } from "https://esm.sh/@std/http@0.177.0/server";
import Stripe from "npm:stripe@^14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
});

// FIX 1: CORS Header erweitert um DELETE, PUT, OPTIONS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS"
};

serve(async (req) => {
  // Preflight-Anfrage sofort beantworten
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Nicht authentifiziert");

    const { data: profile } = await supabase.from("users").select("stripe_customer_id").eq("id", user.id).single();
    const customerId = profile?.stripe_customer_id;

    if (!customerId) return new Response(JSON.stringify({ methods: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // --- GET: Methoden auflisten ---
    if (req.method === "GET") {
      // FIX 2: Liste erweitert um Payco, Naver Pay, Amazon Pay etc.
      const typesToFetch = [
        'card',           // Inkl. Apple/Google/Samsung Pay
        'paypal',
        'sepa_debit',
        'bancontact',
        'blik',
        'eps',
        'klarna',
        'link',
        'customer_balance',
        'ideal',
        'sofort',
        'amazon_pay',     // Neu
        'naver_pay',      // Neu
        'payco',          // Neu
        'giropay',
        'p24',            // Przelewy24 (oft in Polen genutzt)
        'affirm',
        'afterpay_clearpay'
      ];

      const promises = typesToFetch.map(type =>
          stripe.paymentMethods.list({
            customer: customerId,
            type: type as any,
            limit: 100
          }).catch(() => ({ data: [] })) // Fehler ignorieren, falls Typ im Dashboard inaktiv
      );

      const results = await Promise.all(promises);

      const allMethodsRaw = results.flatMap(r => r.data || []);
      // Duplikate entfernen (falls Stripe eine Methode mehrfach listet)
      const uniqueMethods = Array.from(new Map(allMethodsRaw.map(m => [m.id, m])).values());

      const formattedMethods = uniqueMethods.map((pm: any) => {
        let label = "Zahlungsmethode";
        let subLabel = "";
        let icon = "credit-card";

        switch (pm.type) {
          case 'card':
            if (pm.card.wallet) {
              const walletType = pm.card.wallet.type;
              // Formatiert z.B. "samsung_pay" zu "Samsung Pay"
              const walletName = walletType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
              label = `${walletName} •••• ${pm.card.last4}`;
              icon = 'wallet';
            } else {
              label = `•••• ${pm.card.last4}`;
              icon = pm.card.brand;
            }
            subLabel = `Exp: ${pm.card.exp_month}/${pm.card.exp_year}`;
            break;

          case 'paypal':
            label = pm.paypal.payer_email || 'PayPal';
            subLabel = 'Verknüpftes Konto';
            icon = 'paypal';
            break;

          case 'sepa_debit':
            label = `•••• ${pm.sepa_debit.last4}`;
            subLabel = `IBAN (${pm.sepa_debit.country || 'EU'})`;
            icon = 'bank';
            break;

          case 'amazon_pay':
            label = 'Amazon Pay';
            subLabel = 'Wallet';
            icon = 'amazon_pay';
            break;

          case 'naver_pay':
            label = 'Naver Pay';
            subLabel = 'Wallet';
            icon = 'naver_pay';
            break;

          case 'payco':
            label = 'PAYCO';
            subLabel = 'Wallet';
            icon = 'payco';
            break;

          case 'klarna':
            label = 'Klarna';
            subLabel = 'Rechnung / Raten';
            icon = 'klarna';
            break;

          case 'link':
            label = 'Link';
            subLabel = pm.link?.email || 'Stripe Link';
            icon = 'wallet';
            break;

          case 'customer_balance':
            label = 'Guthaben';
            subLabel = 'Banküberweisung';
            icon = 'bank';
            break;

          default:
            // Fallback: Typ-Name formatieren (z.B. "bancontact" -> "Bancontact")
            label = pm.type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            subLabel = '';
            // Optional: Spezifische Icons für bekannte Typen zuweisen
            if (['bancontact', 'blik', 'eps', 'ideal', 'sofort', 'giropay'].includes(pm.type)) {
              icon = 'bank';
            }
            break;
        }

        return {
          id: pm.id,
          type: pm.type,
          label,
          subLabel,
          icon,
          isDefault: false
        };
      });

      return new Response(JSON.stringify({ methods: formattedMethods }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- DELETE: Methode löschen ---
    if (req.method === "DELETE") {
      const { paymentMethodId } = await req.json();
      await stripe.paymentMethods.detach(paymentMethodId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Method not supported");
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});