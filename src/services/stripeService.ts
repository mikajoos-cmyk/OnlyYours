// src/services/stripeService.ts
import { loadStripe, Stripe } from '@stripe/stripe-js/pure';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
  console.error("CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY ist nicht in der .env Datei gesetzt!");
}

let stripePromise: Promise<Stripe | null> | null = null;

// Diese Funktion lädt Stripe erst, wenn sie aufgerufen wird UND der Consent da ist
export const getStripe = () => {
  const consent = localStorage.getItem('cookie-consent');
  const hasConsent = consent === 'all' || consent === 'necessary' || consent === 'true';

  // Wenn keine Zustimmung da ist, blockieren wir Stripe (geben null zurück)
  if (!hasConsent) return null;

  // Nur laden, wenn es noch nicht geladen wurde
  if (!stripePromise && STRIPE_KEY) {
    stripePromise = loadStripe(STRIPE_KEY);
  }

  return stripePromise;
};