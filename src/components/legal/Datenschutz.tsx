import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowLeftIcon } from 'lucide-react';

export default function Datenschutz() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-secondary">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Zurück
        </Button>

        <h1 className="text-3xl font-serif">Datenschutzerklärung</h1>

        <div className="space-y-4 text-muted-foreground">
          <h2 className="text-xl font-medium text-foreground">1. Datenschutz auf einen Blick</h2>
          <p>
            <strong>Allgemeine Hinweise:</strong> Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
          </p>

          <h2 className="text-xl font-medium text-foreground">2. Hosting</h2>
          <p>
            Wir hosten die Inhalte unserer Website bei folgendem Anbieter: Supabase Inc. (USA) und Vercel Inc. (USA). Die Datenverarbeitung erfolgt auf Servern in der EU und den USA. Wir haben mit den Anbietern Verträge zur Auftragsverarbeitung geschlossen.
          </p>

          <h2 className="text-xl font-medium text-foreground">3. Allgemeine Hinweise und Pflichtinformationen</h2>
          <p>
            <strong>Datenschutz:</strong> Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
          </p>
          <p>
            <strong>Hinweis zur verantwortlichen Stelle:</strong><br />
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
            OnlyYours GmbH<br />
            Musterstraße 123, 12345 Berlin<br />
            E-Mail: support@onlyyours.app
          </p>

          <h2 className="text-xl font-medium text-foreground">4. Datenerfassung auf dieser Website</h2>
          <p>
            <strong>Cookies:</strong> Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie dienen dazu, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen.
          </p>
          <p>
            <strong>Zahlungsverkehr:</strong> Zur Abwicklung von Zahlungen (Abonnements, Trinkgelder) nutzen wir den Zahlungsdienstleister Stripe. Ihre Zahlungsdaten werden direkt an Stripe übermittelt und nicht auf unseren Servern gespeichert.
          </p>
        </div>
      </div>
    </div>
  );
}