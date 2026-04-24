import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`\n--- [${requestId}] WEBHOOK START [${new Date().toISOString()}] ---`);

  try {
    // 1. Rohen Body lesen für maximale Transparenz
    const rawBody = await req.text();
    console.log(`[${requestId}] Rohdaten von Ondato:`, rawBody);

    if (!rawBody) {
      console.error(`[${requestId}] Fehler: Leerer Body erhalten.`);
      return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
    }

    const body = JSON.parse(rawBody);

    // 2. Datenquelle identifizieren (Payload-Struktur loggen)
    const data = body.payload ? body.payload : body;
    const userId = data.externalReferenceId;
    const status = data.status;

    console.log(`[${requestId}] Verarbeitung für User: ${userId} | Status: ${status}`);

    if (!userId) {
      console.error(`[${requestId}] Fehler: Keine externalReferenceId im JSON gefunden.`);
      return new Response(JSON.stringify({ error: "Missing externalReferenceId" }), { status: 400 });
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (status === "Successful" || status === "Approved") {
      console.log(`[${requestId}] Identität bestätigt. Starte Daten-Extraktion...`);

      // 3. Detailliertes Logging der Dokumenten-Daten
      // Wir prüfen verschiedene Pfade, da Ondato je nach Konfiguration variiert
      const docData = data.documentData || data.identity?.documentData || data.parsedDocument || data;
      console.log(`[${requestId}] Extrahierte Dokumenten-Rohdaten:`, JSON.stringify(docData, null, 2));

      // Einzelne Felder mit Fallbacks und Trimming
      const firstName = (docData.firstName || docData.name || '').trim();
      const lastName = (docData.lastName || docData.surname || '').trim();
      const realName = `${firstName} ${lastName}`.trim();

      const birthdate = docData.dateOfBirth || docData.dob || null;

      // Adress-Logik
      const addressStreet = docData.address || docData.street || null;
      const addressCity = docData.city || null;
      const addressZip = docData.zipCode || docData.postCode || null;
      const addressCountry = docData.nationality || docData.country || data.country || null;

      console.log(`[${requestId}] Ergebnis Extraktion:`);
      console.log(` -> Name: "${realName}"`);
      console.log(` -> Geburtsdatum: ${birthdate}`);
      console.log(` -> Adresse: ${addressStreet}, ${addressZip} ${addressCity}`);
      console.log(` -> Land: ${addressCountry}`);

      // 4. Update-Objekt zusammenbauen
      const updatePayload: any = {
        is_verified: true,
        identity_verification_status: 'verified'
      };

      if (realName) updatePayload.real_name = realName;
      if (birthdate) updatePayload.birthdate = birthdate;
      if (addressStreet) updatePayload.address_street = addressStreet;
      if (addressCity) updatePayload.address_city = addressCity;
      if (addressZip) updatePayload.address_zip = addressZip;
      if (addressCountry) updatePayload.address_country = addressCountry;

      console.log(`[${requestId}] Sende Update an Supabase Users-Tabelle...`);

      const { data: dbResult, error: dbError } = await supabaseAdmin
          .from('users')
          .update(updatePayload)
          .eq('id', userId)
          .select();

      if (dbError) {
        console.error(`[${requestId}] Supabase Update Fehler:`, dbError);
        throw dbError;
      }

      console.log(`[${requestId}] Datenbank erfolgreich aktualisiert:`, JSON.stringify(dbResult));

    } else if (status === "Failed" || status === "Rejected") {
      console.log(`[${requestId}] Identität abgelehnt. Setze Status auf rejected.`);
      await supabaseAdmin
          .from('users')
          .update({ identity_verification_status: 'rejected' })
          .eq('id', userId);
    } else {
      console.log(`[${requestId}] Status "${status}" erfordert keine Aktion.`);
    }

    console.log(`--- [${requestId}] WEBHOOK ENDE (Success) ---\n`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error(`\n!!! [${requestId}] KRITISCHER FEHLER !!!`);
    console.error(`Nachricht: ${err.message}`);
    console.error(`Stack: ${err.stack}\n`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})