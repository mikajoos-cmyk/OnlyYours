import { useState, useEffect } from 'react';
import { Button } from './button';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Prüfen, ob der Nutzer bereits zugestimmt hat
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShow(false);
    // Lade die Seite neu, damit Stripe initialisiert werden kann
    window.location.reload(); 
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t border-border p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm text-foreground">
        Wir verwenden Cookies und Drittanbieter-Dienste (wie Stripe für Zahlungen), um unsere Webseite bereitzustellen. 
        <a href="/datenschutz" className="underline ml-1 text-secondary">Mehr erfahren</a>
      </div>
      <Button onClick={handleAccept} className="w-full md:w-auto whitespace-nowrap">
        Alle akzeptieren
      </Button>
    </div>
  );
}
