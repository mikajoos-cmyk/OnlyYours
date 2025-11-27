import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  metadata: any;
  onPaymentSuccess: () => Promise<void>;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  description,
  metadata,
  onPaymentSuccess
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && amount > 0) {
      // Reset State beim Öffnen
      setClientSecret('');
      setError(null);

      // Payment Intent vom Backend holen
      supabase.functions.invoke('create-payment-intent', {
        body: {
            amount: amount,
            ...metadata
        }
      }).then(({ data, error }) => {
        if (error) {
            console.error("Fehler beim Laden des Payment Intents:", error);
            setError("Verbindung zum Zahlungsserver fehlgeschlagen.");
            toast({ title: "Fehler", description: "Zahlung konnte nicht initialisiert werden.", variant: "destructive" });
            return;
        }

        // VALIDIERUNG: Prüfen, ob wir wirklich ein Client Secret bekommen haben
        if (data && data.clientSecret && typeof data.clientSecret === 'string') {
            // Ein echtes PaymentIntent Secret beginnt meist mit 'pi_'
            if (data.clientSecret.startsWith('pi_')) {
                setClientSecret(data.clientSecret);
            } else {
                console.error("Ungültiges Client Secret Format:", data.clientSecret);
                setError("Ungültige Antwort vom Zahlungsserver.");
            }
        } else {
            console.error("Kein Client Secret in der Antwort erhalten:", data);
            setError("Zahlungsdaten konnten nicht geladen werden.");
        }
      });
    }
  }, [isOpen, amount, JSON.stringify(metadata)]);

  const handleStripeSuccess = async () => {
      try {
        await onPaymentSuccess();
        onClose();
      } catch (error: any) {
        console.error("Fehler nach erfolgreicher Zahlung:", error);
        toast({ title: "Fehler", description: "Kauf wurde bestätigt, aber Aktivierung schlug fehl.", variant: "destructive" });
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
          "bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto",
          "chat-messages-scrollbar"
      )}>
        <DialogHeader>
          <DialogTitle>Zahlung abschließen</DialogTitle>
        </DialogHeader>

        <div className="p-4">
            <p className="mb-2 text-lg font-medium text-foreground text-center">
                {description}
            </p>
            <p className="mb-6 text-2xl font-serif text-secondary text-center">
                {amount.toFixed(2)}€
            </p>

            {error ? (
                <div className="flex justify-center py-8 text-destructive text-center">
                    <p>{error}</p>
                </div>
            ) : clientSecret ? (
                // Hier wird Elements nur gerendert, wenn clientSecret sicher existiert
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                    <StripeCheckoutForm
                        amount={amount}
                        onSuccess={handleStripeSuccess}
                    />
                </Elements>
            ) : (
                <div className="flex justify-center py-8">
                    <p className="text-muted-foreground animate-pulse">Lade Zahlungsdaten...</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}