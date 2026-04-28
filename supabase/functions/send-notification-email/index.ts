import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || 'https://only-yours.vercel.app';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getEmailLayout = (content: string, userName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background-color: #000000; padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; }
    .content { padding: 40px; line-height: 1.6; color: #333333; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee; }
    .button { display: inline-block; padding: 14px 28px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 25px; }
    .footer a { color: #007bff; text-decoration: none; }
    .accent { color: #007bff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ONLY YOURS</h1>
    </div>
    <div class="content">
      <p style="font-size: 18px; margin-bottom: 20px;">Hallo <b>${userName}</b>,</p>
      ${content}
    </div>
    <div class="footer">
      <p>Du erhältst diese E-Mail, weil du Benachrichtigungen in deinem Profil aktiviert hast.</p>
      <p><a href="${SITE_URL}/profile">Benachrichtigungseinstellungen verwalten</a></p>
      <p>&copy; ${new Date().getFullYear()} Only Yours. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json();
        // type: 'new_post', 'new_message', etc.
        const { type, userId, data } = payload;

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Profil laden für Einstellungen und Name
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // 2. Prüfen ob E-Mail für diesen Typ aktiviert ist
        let isEmailEnabled = false;
        if (type === 'new_post') isEmailEnabled = userProfile.notify_new_post_email;
        else if (type === 'new_message') isEmailEnabled = userProfile.notify_new_message_email;
        
        // Fallback auf den alten globalen Schalter, falls vorhanden
        if (isEmailEnabled === undefined || isEmailEnabled === null) {
            isEmailEnabled = userProfile.email_notifications_enabled;
        }

        if (!isEmailEnabled) {
            return new Response(
                JSON.stringify({ message: `E-Mail-Benachrichtigung für Typ '${type}' ist deaktiviert.` }), 
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
            );
        }

        // 3. E-Mail Adresse abrufen
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        const targetEmail = userData?.user?.email;

        if (userError || !targetEmail) {
            throw new Error("Konnte E-Mail-Adresse nicht ermitteln.");
        }

        // 4. E-Mail Inhalt basierend auf Typ
        let subject = '';
        let contentHtml = '';

        switch (type) {
            case 'new_post':
                subject = `Neuer Post von ${data.creatorName}`;
                contentHtml = `
                  <p>Dein abonnierter Creator <span class="accent">${data.creatorName}</span> hat gerade einen neuen Beitrag hochgeladen.</p>
                  <p>Lass dir die neuesten exklusiven Inhalte nicht entgehen!</p>
                  <a href="${SITE_URL}/post/${data.postId}" class="button">Beitrag ansehen</a>
                `;
                break;
            case 'new_message':
                subject = `Neue Nachricht erhalten`;
                contentHtml = `
                  <p>Du hast eine neue Direktnachricht erhalten.</p>
                  <p>Logge dich ein, um die Nachricht zu lesen und zu antworten.</p>
                  <a href="${SITE_URL}/messages" class="button">Zum Posteingang</a>
                `;
                break;
            default:
                throw new Error("Unbekannter Benachrichtigungs-Typ: " + type);
        }

        // 5. E-Mail via Resend senden
        const emailBody = getEmailLayout(contentHtml, userProfile.display_name || userProfile.username);
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${RESEND_API_KEY}` 
            },
            body: JSON.stringify({
                from: 'Only Yours <notifications@onlyyours.net>',
                to: [targetEmail],
                subject: subject,
                html: emailBody
            })
        });

        const resData = await response.json();

        return new Response(JSON.stringify({ message: "Benachrichtigung erfolgreich verarbeitet", resendId: resData.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("Error in send-notification-email:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
})
