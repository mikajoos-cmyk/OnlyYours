import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // Anbieter wie Veriff oder Ondato senden die "vendorData" zurück, 
    // die wir in Schritt 1 übergeben haben (das ist unsere Supabase User-ID!)
    const userId = payload.verification.vendorData;
    const status = payload.verification.status; // z.B. "approved" oder "declined"

    if (status === "approved") {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Nutzer in der OnlyYours-Datenbank als verifiziert markieren
      await supabaseAdmin
        .from('users')
        .update({ 
          is_verified: true,
          identity_verification_status: 'verified'
          // Falls du ein extra feld für Altersverifikation hast:
          // is_age_verified: true 
        })
        .eq('id', userId);
        
      console.log(`User ${userId} erfolgreich verifiziert.`);
    } else if (status === "declined") {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin
        .from('users')
        .update({ 
          identity_verification_status: 'rejected'
        })
        .eq('id', userId);
    }

    // Webhooks müssen immer mit 200 OK beantwortet werden
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
