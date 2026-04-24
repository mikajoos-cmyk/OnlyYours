import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './button';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const location = useLocation();

  const excludedPaths = ['/datenschutz', '/impressum', '/agb', '/creator-vertrag'];
  const isExcludedPath = excludedPaths.includes(location.pathname);

  useEffect(() => {
    // Prüfen, ob der Nutzer bereits zugestimmt hat
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = (type: 'all' | 'necessary') => {
    localStorage.setItem('cookie-consent', type);
    setShow(false);
    // Lade die Seite neu, damit Stripe initialisiert werden kann
    window.location.reload(); 
  };

  if (!show || isExcludedPath) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-8 flex flex-col gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Cookie-Einstellungen</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir verwenden Cookies und ähnliche Technologien, um unsere Webseite bereitzustellen, die Funktionalität zu gewährleisten und dein Nutzererlebnis zu verbessern. 
            Einige dieser Dienste (wie Stripe für die sichere Zahlungsabwicklung) sind für den Betrieb der Seite technisch notwendig.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Detaillierte Informationen findest du in unserer Datenschutzerklärung und in unserem Impressum.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Datenschutzerklärung</a>
          <span className="text-muted-foreground">•</span>
          <a href="/impressum" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Impressum</a>
          <span className="text-muted-foreground">•</span>
          <a href="/agb" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">AGB</a>
          <span className="text-muted-foreground">•</span>
          <a href="/creator-vertrag" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Creator-Vertrag</a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={() => handleAccept('necessary')} variant="outline" className="flex-1 text-lg py-6">
            Nur notwendige
          </Button>
          <Button onClick={() => handleAccept('all')} className="flex-1 text-lg py-6">
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
