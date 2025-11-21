// src/components/fan/StripeCheckoutForm.tsx
import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Loader2Icon, LockIcon } from 'lucide-react';

interface StripeCheckoutFormProps {
  amount: number;
  onSuccess: () => void;
}

export default function StripeCheckoutForm({ amount, onSuccess }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe ist noch nicht geladen
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // WICHTIG: Wohin soll der User geleitet werden, wenn z.B. PayPal einen Redirect braucht?
        // Du solltest eine Route '/payment-success' oder ähnliches haben, oder einfach die aktuelle Seite:
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      // Fehler bei der Zahlung (z.B. Karte abgelehnt)
      setMessage(error.message ?? "Ein unbekannter Fehler ist aufgetreten.");
      toast({
        title: "Zahlung fehlgeschlagen",
        description: error.message,
        variant: "destructive"
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Zahlung direkt erfolgreich (ohne Redirect)
      onSuccess();
      setIsProcessing(false);
    } else {
      // Unerwarteter Status
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

      {message && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {message}
        </div>
      )}

      <Button
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
      >
        {isProcessing ? (
          <>
            <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
            Verarbeite...
          </>
        ) : (
          <>
            <LockIcon className="w-4 h-4 mr-2" />
            Jetzt {amount.toFixed(2)}€ bezahlen
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Zahlungen werden sicher über Stripe verarbeitet. Wir speichern keine Kartendaten.
      </p>
    </form>
  );
}