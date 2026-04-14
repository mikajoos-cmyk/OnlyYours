import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const API_KEY = Deno.env.get('VERIFICATION_API_KEY'); // Dein Key aus dem Self-Serve Dashboard
const API_URL = 'https://api.provider.com/v1/sessions'; // Die URL des Anbieters (z.B. api.veriff.me)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, type } = await req.json(); // type: 'creator' (ID) oder 'fan' (nur Alter)

    // Session beim Anbieter erstellen
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        verification: {
          // Wir übergeben die Supabase userId, damit wir später wissen, wer verifiziert wurde
          vendorData: userId, 
          // Rückkehr-Link in deine App nach Abschluss
          callbackUrl: 'https://only-yours.vercel.app/dashboard', 
        }
      })
    });

    const data = await response.json();

    // Der Anbieter gibt eine URL zurück (z.B. data.url oder data.verification.url)
    return new Response(JSON.stringify({ redirectUrl: data.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})