import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        // Erwartet z.B. { type: 'new_post', userId: '...', data: { creatorName: '...', postId: '...' } }
        const { type, userId, data } = payload;

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Prüfen ob Nutzer Benachrichtigungen aktiviert hat
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('email_notifications_enabled, display_name')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // Abbruch, wenn der Nutzer keine E-Mails möchte
        if (!userProfile?.email_notifications_enabled) {
            return new Response(
                JSON.stringify({ message: "Nutzer hat E-Mail-Benachrichtigungen deaktiviert. E-Mail übersprungen." }), 
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        // 2. E-Mail Adresse über Auth-Service abrufen
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        const targetEmail = userData?.user?.email;

        if (userError || !targetEmail) {
            throw new Error("Konnte E-Mail-Adresse nicht ermitteln.");
        }

        // 3. E-Mail Inhalte definieren
        let subject = '';
        let htmlContent = '';

        switch (type) {
            case 'new_post':
                subject = `Neuer Post von ${data.creatorName}`;
                htmlContent = `
                  <p>Hallo ${userProfile.display_name},</p>
                  <p>Dein abonnierter Creator <b>${data.creatorName}</b> hat gerade etwas Neues gepostet!</p>
                  <p><a href="https://deine-domain.com/post/${data.postId}">Jetzt ansehen</a></p>
                `;
                break;
            case 'new_message':
                subject = `Neue Nachricht erhalten`;
                htmlContent = `<p>Du hast eine neue Direktnachricht erhalten. Logge dich ein, um sie zu lesen.</p>`;
                break;
            default:
                throw new Error("Unbekannter Benachrichtigungs-Typ");
        }

        // 4. E-Mail via Resend senden
        const emailToSend = {
            from: 'Only Yours <notifications@onlyyours.net>',
            to: [targetEmail],
            subject: subject,
            html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              ${htmlContent}
              <hr />
              <small>Du erhältst diese E-Mail, weil du Benachrichtigungen in deinem Profil aktiviert hast. Du kannst diese jederzeit in deinen <a href="https://deine-domain.com/profile">Profileinstellungen</a> deaktivieren.</small>
            </div>`
        };

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify(emailToSend)
        });

        const resData = await response.json();

        return new Response(JSON.stringify({ message: "Benachrichtigung gesendet", resendId: resData.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
})
