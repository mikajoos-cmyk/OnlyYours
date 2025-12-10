// src/services/stripeService.ts
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_KEY) {
    console.error("CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY ist nicht in der .env Datei gesetzt!");
}

// Lädt Stripe asynchron. Wichtig: loadStripe darf nicht innerhalb einer Komponente aufgerufen werden.
export const stripePromise = loadStripe(STRIPE_KEY || '');