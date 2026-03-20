import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  IDVClient,
  SessionSpecificationBuilder,
  RequestedDocumentAuthenticityCheckBuilder,
  RequestedLivenessCheckBuilder,
  RequestedTextExtractionTaskBuilder
} from "npm:@getyoti/sdk-idverify@1.0.0" // Aktuelle Yoti SDK Version

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    })

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht authentifiziert')

    // 1. Benutzerrolle aus der public.users Tabelle laden
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) throw new Error('Benutzerprofil nicht gefunden');
    const isCreator = userData.role.toLowerCase() === 'creator';

    // 2. Yoti Client initialisieren
    const yotiClient = new IDVClient(
        Deno.env.get('YOTI_CLIENT_SDK_ID')!,
        Deno.env.get('YOTI_PEM_KEY')! // Der Inhalt deiner .pem Datei
    );

    // 3. Was wollen wir prüfen? 
    const documentCheck = new RequestedDocumentAuthenticityCheckBuilder().build();
    
    // Selfie/Liveness nur für Creator (Full Check)
    const checks = [documentCheck];
    if (isCreator) {
      const livenessCheck = new RequestedLivenessCheckBuilder()
          .forZoomLiveness() // Yoti's Standard Anti-Spoofing Selfie
          .build();
      checks.push(livenessCheck);
    }

    const textExtractionTask = new RequestedTextExtractionTaskBuilder()
        .withManualCheckFallback()
        .build();

    // 4. Session bauen
    const sessionSpecBuilder = new SessionSpecificationBuilder()
        .withClientSessionTokenTtl(600) // Token ist 10 Minuten gültig
        .withResourcesTtl(7 * 24 * 60 * 60) // Daten werden nach 7 Tagen bei Yoti gelöscht
        .withUserTrackingId(user.id) // Verknüpfung zu deinem Supabase User
        .withRequestedTask(textExtractionTask)
        // Redirect URL nach Abschluss im Hosted Portal:
        .withSuccessUrl('https://only-yours.vercel.app/onboarding/identity?status=success')
        .withErrorUrl('https://only-yours.vercel.app/onboarding/identity?status=error');

    // Alle definierten Checks hinzufügen
    checks.forEach(check => sessionSpecBuilder.withRequestedCheck(check));
    
    const sessionSpec = sessionSpecBuilder.build();

    // 5. Session bei Yoti erstellen
    const session = await yotiClient.createSession(sessionSpec);

    // 6. Session ID in Datenbank merken (um sie beim Webhook zuzuordnen)
    await supabase.from('users').update({ external_verification_id: session.getSessionId() }).eq('id', user.id);

    // 7. Rückgabe an das Frontend (Yoti gibt eine Hosted-URL zurück)
    const clientSessionToken = session.getClientSessionToken();
    const hostedUrl = `https://api.yoti.com/idverify/v1/web/index.html?sessionID=${session.getSessionId()}&sessionToken=${clientSessionToken}`;

    return new Response(JSON.stringify({ url: hostedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})