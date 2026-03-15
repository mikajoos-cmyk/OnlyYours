import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Typen für den Webhook-Payload definieren
interface ReportRecord {
    id: string;
    reporter_id: string;
    post_id: string;
    status: string;
    resolution_reason: string;
}

interface WebhookPayload {
    type: 'INSERT' | 'UPDATE';
    table: string;
    record: ReportRecord;
    old_record: ReportRecord | null;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { type, email, userId, data } = await req.json();

        let targetEmail = email;

        // Falls keine Email aber eine userId da ist, Email via Admin SDK holen
        if (!targetEmail && userId) {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (userError || !userData?.user?.email) {
                console.error("User for email not found:", userError);
            } else {
                targetEmail = userData.user.email;
            }
        }

        if (!targetEmail) {
            return new Response(JSON.stringify({ error: "No recipient email found" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            });
        }

        let subject = '';
        let htmlContent = '';

        switch (type) {
            // AN DEN MELDER (FAN/CREATOR)
            case 'report_received':
                subject = 'Wir haben deine Meldung erhalten';
                htmlContent = `<p>Hallo,</p>
      <p>wir haben deine Meldung zum Thema <b>${data.reason}</b> erhalten.</p>
      <p>Unser Moderations-Team prüft den Vorfall schnellstmöglich gem. unserer Richtlinien und des Digital Services Act. Wir melden uns bei dir, sobald es ein Ergebnis gibt.</p>`;
                break;

            case 'report_resolved':
                subject = 'Update zu deiner Meldung';
                htmlContent = `<p>Hallo,</p>
      <p>vielen Dank für deine Geduld. Wir haben deine Meldung geprüft und entsprechende Maßnahmen gegen den betroffenen Account/Inhalt ergriffen.</p>
      <p><i>Aus datenschutzrechtlichen Gründen (DSGVO) können wir keine detaillierten Auskünfte über accountbezogene Sanktionen gegen andere Nutzer erteilen.</i></p>`;
                break;

            // AN DEN GEMELDETEN (CREATOR/FAN)
            case 'account_suspended':
                subject = 'Wichtige Information: Account-Sperrung';
                htmlContent = `<p>Hallo,</p>
      <p>dein Account wurde nach Prüfung durch unser Team gesperrt.</p>
      <p><b>Grund:</b> Verstoß gegen unsere Richtlinien (${data.reason}).</p>
      <p>Du hast das Recht, gegen diese Entscheidung einmalig Widerspruch einzulegen. Logge dich dazu in die App ein und nutze das Formular auf dem Sperrbildschirm.</p>`;
                break;

            case 'content_moderated':
                subject = 'Wichtige Information: Inhalt gesperrt';
                htmlContent = `<p>Hallo,</p>
      <p>einer deiner Beiträge wurde nach Prüfung durch unser Team gesperrt.</p>
      <p><b>Grund:</b> Verstoß gegen unsere Richtlinien (${data.reason}).</p>
      <p>Du hast das Recht, gegen diese Entscheidung einmalig Widerspruch einzulegen. Gehe dazu in deinen Content Vault unter den Tab "Moderiert".</p>`;
                break;

            case 'appeal_decision':
                subject = 'Entscheidung zu deinem Widerspruch';
                htmlContent = `<p>Hallo,</p>
      <p>unser Team hat deinen Widerspruch geprüft.</p>
      <p><b>Ergebnis:</b> ${data.appealStatus === 'accepted' ? 'Deinem Widerspruch wurde stattgegeben. Die entsprechende Sperrung wurde aufgehoben.' : 'Dein Widerspruch wurde abgelehnt. Die Sperrung bleibt bestehen.'}</p>
      <p><b>Begründung des Teams:</b> ${data.adminNotes}</p>`;
                break;

            default:
                return new Response(JSON.stringify({ error: "Unknown email type" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400
                });
        }

        const emailToSend = {
            from: 'Only Yours Support <support@onlyyours.app>',
            to: [targetEmail],
            subject: subject,
            html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              ${htmlContent}
              <hr />
              <small>Information gemäß EU Digital Services Act / DSGVO.</small>
            </div>`
        };

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify(emailToSend)
        });

        return new Response(JSON.stringify({ message: "E-Mail versendet" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        })

    } catch (err) {
        console.error("Edge Function Error:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        })
    }
})