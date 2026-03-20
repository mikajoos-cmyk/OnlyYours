import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { IDVClient } from "npm:@getyoti/sdk-idverify@1.0.0"

serve(async (req) => {
  try {
    // Webhook Payload von Yoti lesen
    const payload = await req.json()
    const sessionId = payload.session_id;
    const state = payload.state; // z.B. "COMPLETED"

    if (state !== 'COMPLETED') {
        return new Response("Not completed yet", { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Admin Rechte!
    );

    // 1. Finde den User anhand der Session ID
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('external_verification_id', sessionId)
      .single();

    if (userErr || !user) throw new Error("User zur Session nicht gefunden");

    // 2. Yoti Client initialisieren, um die Daten abzuholen
    const yotiClient = new IDVClient(
      Deno.env.get('YOTI_CLIENT_SDK_ID')!,
      Deno.env.get('YOTI_PEM_KEY')!
    );

    // 3. Resultate der Session abrufen
    const sessionResult = await yotiClient.getSession(sessionId);
    
    // Prüfen, ob die Identifikation wirklich erfolgreich war
    const isAuthentic = sessionResult.getAuthenticityChecks().every(check => check.getState() === 'COMPLETED');
    const isAlive = sessionResult.getLivenessChecks().every(check => check.getState() === 'COMPLETED');

    if (isAuthentic && isAlive) {
      // 4. Extrahierte Daten aus dem Ausweis holen
      const textExtraction = sessionResult.getTextExtractionTasks()[0];
      const extractedData = textExtraction?.getGeneratedTextDataEntries()[0]?.getDocumentFields();

      const fullName = extractedData?.full_name?.value || '';
      const birthDate = extractedData?.date_of_birth?.value || null;
      
      // Adressdaten extrahieren (falls vorhanden, meist für Creator wichtig)
      const street = extractedData?.address?.value || '';
      const city = extractedData?.town_city?.value || '';
      const zip = extractedData?.postal_code?.value || '';
      const country = extractedData?.country_iso_code?.value || extractedData?.country?.value || '';

      // 5. Supabase Datenbank aktualisieren!
      await supabaseAdmin.from('users').update({
        identity_verification_status: 'verified',
        real_name: fullName,
        birthdate: birthDate,
        address_street: street,
        address_city: city,
        address_zip: zip,
        address_country: country,
        is_verified: true // App-internes Badge freischalten
      }).eq('id', user.id);

      // (Optional) Session bei Yoti sofort löschen aus Datenschutzgründen (DSGVO)
      await yotiClient.deleteSession(sessionId);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      // Verifizierung fehlgeschlagen (Falscher Ausweis, Fake-Selfie etc.)
      await supabaseAdmin.from('users').update({
        identity_verification_status: 'rejected'
      }).eq('id', user.id);
      
      return new Response("Verification failed checks", { status: 200 });
    }

  } catch (err) {
    console.error("Yoti Webhook Error:", err.message);
    return new Response("Webhook Error", { status: 500 });
  }
})
