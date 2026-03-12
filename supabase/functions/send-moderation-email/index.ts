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

serve(async (req) => {
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload: WebhookPayload = await req.json()
        const { record, old_record, type } = payload

        // 1. Validierung: Nur bei Status-Änderungen aktiv werden (DSA Art. 17) [cite: 55]
        if (type !== 'UPDATE' || record.status === old_record?.status) {
            return new Response("Keine Statusänderung", { status: 200 })
        }

        if (!['RESOLVED_TAKEDOWN', 'RESOLVED_DISMISSED'].includes(record.status)) {
            return new Response("Status nicht relevant für E-Mail", { status: 200 })
        }

        // 2. Daten abrufen (E-Mails & Creator Info)
        // Wir brauchen die E-Mail des Melders und (bei Takedown) die des Creators
        let reporterEmail: string | null = null;
        if (record.reporter_id) {
            const { data: reporter, error: reporterErr } = await supabaseAdmin.auth.admin.getUserById(record.reporter_id)
            if (!reporterErr && reporter?.user?.email) {
                reporterEmail = reporter.user.email;
            }
        }

        // Creator ID über den Post ermitteln
        const { data: post, error: postErr } = await supabaseAdmin
            .from('posts')
            .select('creator_id')
            .eq('id', record.post_id)
            .single()

        if (postErr || !post) {
            console.error("Post konnte nicht geladen werden:", postErr);
            return new Response("Post nicht gefunden", { status: 404 });
        }

        const { data: creator, error: creatorErr } = await supabaseAdmin.auth.admin.getUserById(post.creator_id)
        if (creatorErr || !creator?.user?.email) {
            console.error("Creator-Daten konnten nicht geladen werden:", creatorErr);
        }

        const emailsToSend = []

        // 3. E-Mail Inhalt für Melder generieren (Art. 16 DSA) [cite: 44]
        if (reporterEmail) {
            const reporterSubject = record.status === 'RESOLVED_TAKEDOWN'
                ? "Update zu deiner Meldung: Inhalt entfernt"
                : "Update zu deiner Meldung: Prüfung abgeschlossen";

            emailsToSend.push({
                from: 'Only Yours Support <support@onlyyours.app>',
                to: [reporterEmail],
                subject: reporterSubject,
                html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              <h2>Hallo,</h2>
              <p>vielen Dank für deine Unterstützung. Wir haben den von dir gemeldeten Inhalt geprüft.</p>
              <p><strong>Entscheidung:</strong> ${record.status === 'RESOLVED_TAKEDOWN' ? 'Der Inhalt wurde entfernt.' : 'Der Inhalt bleibt online.'}</p>
              <p><strong>Begründung:</strong> ${record.resolution_reason || 'Keine Angabe'}</p>
              <hr />
              <small>Dies ist eine automatisierte Nachricht gemäß EU Digital Services Act.</small>
            </div>`
            })
        }

        // 4. E-Mail Inhalt für Creator generieren (Art. 17 DSA Begründungspflicht)
        if (record.status === 'RESOLVED_TAKEDOWN' && creator?.user?.email) {
            emailsToSend.push({
                from: 'Only Yours Moderation <legal@onlyyours.app>',
                to: [creator.user.email],
                subject: "WICHTIG: Dein Inhalt wurde aufgrund einer Meldung entfernt",
                html: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h2>Hallo,</h2>
            <p>einer deiner Beiträge wurde von unserer Moderation entfernt, da er gegen unsere Richtlinien verstößt.</p>
            <p><strong>Grund der Sperrung:</strong> ${record.resolution_reason || 'Verstoß gegen Community-Richtlinien'}</p>
            <p>Du hast das Recht, innerhalb von 6 Monaten Widerspruch gegen diese Entscheidung einzulegen. Dies kannst du direkt in deinem Creator-Dashboard unter "Moderation" tun.</p>
            <hr />
            <small>Information gemäß Art. 17 Digital Services Act.</small>
          </div>`
            })
        }

        if (emailsToSend.length === 0) {
            return new Response("Keine E-Mails zu versenden", { status: 200 })
        }

        // 5. Versand via Resend
        const responses = await Promise.all(emailsToSend.map(email =>
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify(email)
            })
        ))

        return new Response(JSON.stringify({ message: "E-Mails versendet", count: responses.length }), {
            headers: { "Content-Type": "application/json" },
            status: 200
        })

    } catch (err) {
        console.error("Edge Function Error:", err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500
        })
    }
})