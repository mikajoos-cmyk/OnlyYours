// src/components/fan/StripeCheckoutForm.tsx
import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Loader2Icon, LockIcon } from 'lucide-react';

export default function StripeCheckoutForm({ amount, onSuccess }: { amount: number, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false); // Neuer State um Flackern zu vermeiden

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
      },
      redirect: "if_required",
    });

    if (error) {
      // Zeige verständliche Fehlermeldungen (z.B. "Karte abgelehnt")
      toast({
        title: "Zahlung nicht erfolgreich",
        description: error.message || "Bitte überprüfe deine Kartendaten.",
        variant: "destructive"
      });
      setIsProcessing(false);
    } else {
      onSuccess();
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-h-[200px]"> {/* Platzhalterhöhe um Layout-Springen zu vermeiden */}
        <PaymentElement
          onReady={() => setIsReady(true)}
          options={{
            layout: "tabs" // Tabs ist benutzerfreundlicher auf Mobile
          }}
        />
      </div>

      <Button
        disabled={!stripe || !isReady || isProcessing}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base"
      >
        {isProcessing ? (
          <><Loader2Icon className="animate-spin mr-2" /> Verarbeitung...</>
        ) : (
          <><LockIcon className="w-4 h-4 mr-2" /> Bezahlen ({amount.toFixed(2)}€)</>
        )}
      </Button>

    </form>
  );
}