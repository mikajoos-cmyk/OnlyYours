// src/services/stripeService.ts
import { loadStripe } from '@stripe/stripe-js';

// Lädt Stripe asynchron mit dem Key aus der Umgebungsvariable
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);