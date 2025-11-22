import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Loader2Icon } from 'lucide-react';

export default function StripeCheckoutForm({ amount, onSuccess }: { amount: number, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Nach Erfolg hierhin zurückkehren (für Web-Redirects wie PayPal wichtig)
        return_url: window.location.origin + '/payment-success',
      },
      redirect: "if_required", // Verhindert Redirect, wenn nicht nötig (z.B. Kreditkarte)
    });

    if (error) {
      toast({ title: "Zahlungsfehler", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    } else {
      // Zahlung erfolgreich
      onSuccess();
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Das hier rendert automatisch Kreditkarte, PayPal, Apple Pay etc. */}
      <PaymentElement />
      <Button
        disabled={!stripe || isProcessing}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
      >
        {isProcessing ? <Loader2Icon className="animate-spin" /> : `Bezahlen (${amount.toFixed(2)}€)`}
      </Button>
    </form>
  );
}