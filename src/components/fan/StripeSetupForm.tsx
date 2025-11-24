import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Loader2Icon } from 'lucide-react';

export default function StripeSetupForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    // WICHTIG: Hier nutzen wir confirmSetup statt confirmPayment
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/profile', // Redirect URL bei Erfolg (für manche Methoden)
      },
      redirect: "if_required",
    });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    } else {
      onSuccess();
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        disabled={!stripe || isProcessing}
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal py-6"
      >
        {isProcessing ? <Loader2Icon className="animate-spin" /> : 'Zahlungsmethode speichern'}
      </Button>
    </form>
  );
}