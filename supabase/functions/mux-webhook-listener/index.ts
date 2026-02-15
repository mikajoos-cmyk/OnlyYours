// supabase/functions/mux-webhook-listener/index.ts
// (Version 7 - Manuelle Signatur-Verifizierung, kein Mux-SDK-Import)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('--- Mux Webhook Listener Function Initialized (Version 7 - Manuell) ---');

const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const muxWebhookSecret = Deno.env.get('MUX_WEBHOOK_SECRET');
if (!muxWebhookSecret) {
  console.error('FATAL: MUX_WEBHOOK_SECRET ist nicht in den Supabase-Secrets gesetzt!');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- NEUE HELPER-FUNKTION: Signatur manuell verifizieren ---
async function verifySignature(signatureHeader: string, rawBody: string, secret: string): Promise<boolean> {
  // 1. Teile den Header in Zeitstempel und Signatur
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find(part => part.startsWith('t='));
  const signaturePart = parts.find(part => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    console.error('Ungültiges Signatur-Header-Format:', signatureHeader);
    return false;
  }

  const timestamp = timestampPart.split('=')[1];
  const receivedSignature = signaturePart.split('=')[1];

  // 2. Erstelle den Payload, den Mux signiert hat: "timestamp.body"
  const payload = `${timestamp}.${rawBody}`;

  // 3. Importiere das Secret für Deno Crypto
  const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
  );

  // 4. Erstelle unseren eigenen HMAC-SHA256 Hash
  const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload)
  );

  // 5. Konvertiere unseren Hash in einen Hex-String
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  // 6. Vergleiche die Signaturen
  if (receivedSignature === expectedSignature) {
    // Optional: Zeitstempel-Toleranz prüfen (z.B. 5 Minuten)
    const timeDiff = Math.abs(Date.now() - (parseInt(timestamp) * 1000));
    if (timeDiff > 300000) { // 300.000 ms = 5 Minuten
      console.warn('Signatur ist gültig, aber Zeitstempel ist zu alt.');
      return false;
    }
    return true;
  }

  console.warn('Signatur-Vergleich fehlgeschlagen.');
  return false;
}
// --- ENDE HELPER-FUNKTION ---


serve(async (req) => {
  console.log(`--- Request received at: ${new Date().toISOString()} ---`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('mux-signature');
    const rawBody = await req.text();

    if (!muxWebhookSecret) {
      console.error('Verifizierung gestoppt: MUX_WEBHOOK_SECRET fehlt.');
      return new Response('Webhook Secret nicht konfiguriert', { status: 500, headers: corsHeaders });
    }

    // 1. Signatur-Verifizierung (manuell)
    const isVerified = await verifySignature(signature!, rawBody, muxWebhookSecret);

    if (!isVerified) {
      console.error('!!! Signatur-Verifizierung FEHLGESCHLAGEN (Manuelle Prüfung)');
      return new Response('Signatur-Verifizierung fehlgeschlagen', { status: 400, headers: corsHeaders });
    }
    console.log('Signatur erfolgreich verifiziert (Manuelle Prüfung).');

    // 2. Event parsen
    const event = JSON.parse(rawBody);
    const data = event.data;
    const creatorId = data.passthrough;

    if (!creatorId) {
      return new Response('Keine passthrough ID', { status: 200, headers: corsHeaders });
    }

    let isLiveStatus: boolean | null = null;

    // 3. Status setzen
    switch (event.type) {
      case 'video.live_stream.active':
        isLiveStatus = true;
        break;
      case 'video.live_stream.idle':
        isLiveStatus = false;
        break;
      default:
        return new Response('Unbehandeltes Event', { status: 200, headers: corsHeaders });
    }

    // 4. Datenbank via RPC aufrufen
    console.log(`Rufe RPC 'set_user_live_status' auf: User ${creatorId}, Status ${isLiveStatus}`);

    const { error: rpcError } = await adminSupabase.rpc('set_user_live_status', {
      creator_id_input: creatorId,
      is_live_input: isLiveStatus
    });

    if (rpcError) {
      console.error(`!!! RPC-Aufruf FEHLGESCHLAGEN für ${creatorId}:`, rpcError.message);
      return new Response(`RPC-Aufruf fehlgeschlagen: ${rpcError.message}`, { status: 500, headers: corsHeaders });
    }

    console.log(`+++ RPC-Aufruf ERFOLGREICH für ${creatorId}. Status auf ${isLiveStatus} gesetzt.`);
    return new Response('Webhook erfolgreich verarbeitet (RPC)', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Unerwarteter Fehler im Webhook-Handler:', error.message);
    return new Response(`Server-Fehler: ${error.message}`, { status: 500, headers: corsHeaders });
  }
});