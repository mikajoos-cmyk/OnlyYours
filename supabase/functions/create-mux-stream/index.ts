// supabase/functions/create-mux-stream/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Mux from 'https://esm.sh/@mux/mux-node@8';
// Mux-Client mit Ihren Secrets initialisieren
const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = Deno.env.toObject();
const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET
});
// --- NEU: CORS-Header definieren ---
// Diese Header erlauben Anfragen von JEDER Domain (*).
// Für die Produktion können Sie '*' durch 'https://deine-live-domain.com' ersetzen.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// --- ENDE NEU ---
Deno.serve(async (req)=>{
  // --- NEU: Preflight-Anfrage (OPTIONS) behandeln ---
  // Der Browser sendet dies automatisch VOR der POST-Anfrage
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // --- ENDE NEU ---
  try {
    // 1. Authentifizierung des Benutzers über den Auth-Header
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: 'Not authenticated'
      }), {
        status: 401,
        // --- WICHTIG: CORS-Header auch bei Fehlern senden ---
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Anfrage für User ${user.id} erhalten.`);
    // 2. Neuen Live-Stream auf Mux erstellen
    const liveStream = await mux.video.liveStreams.create({
      playback_policy: [
        'public'
      ],
      new_asset_settings: {
        playback_policy: [
          'public'
        ]
      },
      passthrough: user.id
    });
    if (!liveStream || !liveStream.stream_key || !liveStream.playback_ids) {
      throw new Error('Mux API hat keinen Stream zurückgegeben.');
    }
    const streamKey = liveStream.stream_key;
    const playbackId = liveStream.playback_ids[0].id;
    console.log(`Mux Stream erstellt: ${liveStream.id}. PlaybackID: ${playbackId}`);
    // 3. Stream Key und Playback ID in der 'users'-Tabelle speichern
    const adminSupabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { error: updateError } = await adminSupabase.from('users').update({
      mux_stream_key: streamKey,
      mux_playback_id: playbackId
    }).eq('id', user.id);
    if (updateError) {
      throw updateError;
    }
    console.log(`Stream-Daten für User ${user.id} in DB gespeichert.`);
    // 4. Die neuen Daten zurückgeben
    return new Response(JSON.stringify({
      mux_stream_key: streamKey,
      mux_playback_id: playbackId
    }), {
      // --- WICHTIG: CORS-Header zur Erfolgsantwort hinzufügen ---
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Fehler in Edge Function:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      // --- WICHTIG: CORS-Header auch bei Fehlern senden ---
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
