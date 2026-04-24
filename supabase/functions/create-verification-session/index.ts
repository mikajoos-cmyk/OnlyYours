import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// API URLs (mit Fallback auf Sandbox)
const ONDATO_API_URL = Deno.env.get('ONDATO_API_URL') || 'https://sandbox-api.ondato.com/v1';

// Auth URLs für den Token (Abhängig davon, ob wir in der Sandbox sind)
const isSandbox = ONDATO_API_URL.includes('sandbox');
const ONDATO_AUTH_URL = isSandbox
    ? 'https://sandbox-id.ondato.com/connect/token'
    : 'https://id.ondato.com/connect/token';

const CLIENT_ID = Deno.env.get('ONDATO_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('ONDATO_CLIENT_SECRET');
const SETUP_ID = Deno.env.get('ONDATO_SETUP_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Holt den OAuth2 Token vom speziellen ID-Endpunkt
async function getOndatoToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('CLIENT_ID oder CLIENT_SECRET fehlen in den Umgebungsvariablen.');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  const response = await fetch(ONDATO_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Auth fehlgeschlagen (Status ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId } = await req.json();

    if (!userId) throw new Error('Keine User-ID angegeben');
    if (!SETUP_ID) throw new Error('Ondato Setup ID fehlt in den Server-Umgebungsvariablen');

    // 1. Authentifizierung
    const token = await getOndatoToken();

    // 2. Erstelle die Verifizierungs-Session (mit der korrekten IDV-Domain!)
    // Wir leiten automatisch auf die richtige IDV-Domain um, je nachdem ob Sandbox oder Live
    const isSandboxEnv = ONDATO_API_URL.includes('sandbox');
    const IDV_BASE_URL = isSandboxEnv 
      ? 'https://sandbox-idvapi.ondato.com/v1' 
      : 'https://idvapi.ondato.com/v1';

    const response = await fetch(`${IDV_BASE_URL}/identity-verifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        setupId: SETUP_ID, 
        externalReferenceId: userId, 
        successRedirectUrl: 'https://only-yours.vercel.app/dashboard',
        failRedirectUrl: 'https://only-yours.vercel.app/dashboard'
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fehler bei der Session-Erstellung (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Erfolgreiche Antwort von Ondato:", data); 

    // Wir suchen die ID aus der Antwort
    const sessionId = data.id || data.identificationId;
    
    // Wir prüfen, ob Ondato doch eine URL geschickt hat (als Fallback)
    let finalUrl = data.url || data.identificationUrl || data.redirectUrl || data.link;

    // Wenn keine URL kam, wir aber die ID haben, bauen wir den offiziellen Link selbst!
    if (!finalUrl && sessionId) {
      finalUrl = isSandboxEnv 
        ? `https://sandbox-idv.ondato.com/?id=${sessionId}`
        : `https://idv.ondato.com/?id=${sessionId}`;
    }

    if (!finalUrl) {
      throw new Error(`Konnte keine URL generieren. Ondato Daten: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ 
      redirectUrl: finalUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Verification Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
})