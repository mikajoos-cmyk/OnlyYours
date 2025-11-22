import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useToast } from '../../hooks/use-toast';

// Wir definieren flexiblere Props
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;           // Der Preis
  description: string;      // Was wird gekauft? (z.B. "Abo für ...")
  metadata: any;            // Daten für das Backend (creatorId, tierId, postId etc.)
  onPaymentSuccess: () => Promise<void>; // Callback, der NACH Stripe-Erfolg ausgeführt wird
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

  useEffect(() => {
    if (isOpen && amount > 0) {
      // Payment Intent vom Backend holen
      supabase.functions.invoke('create-payment-intent', {
        body: {
            amount: amount,
            ...metadata // Wir reichen creatorId, postId etc. weiter
        }
      }).then(({ data, error }) => {
        if (data) setClientSecret(data.clientSecret);
        if (error) {
            console.error("Fehler beim Laden des Payment Intents:", error);
            toast({ title: "Fehler", description: "Zahlung konnte nicht initialisiert werden.", variant: "destructive" });
        }
      });
    }
  }, [isOpen, amount, JSON.stringify(metadata)]); // Metadata als dependency

  const handleStripeSuccess = async () => {
      try {
        // Erst WENN Stripe erfolgreich war, führen wir die Datenbank-Operation aus
        await onPaymentSuccess();
        onClose();
      } catch (error: any) {
        console.error("Fehler nach erfolgreicher Zahlung:", error);
        toast({ title: "Fehler", description: "Kauf wurde bestätigt, aber Aktivierung schlug fehl.", variant: "destructive" });
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* ÄNDERUNG: 'max-h-[90vh]' und 'overflow-y-auto' hinzugefügt.
          Damit passt sich das Modal der Bildschirmhöhe an und wird scrollbar,
          wenn viele Zahlungsmethoden angezeigt werden.
      */}
      <DialogContent className="bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto">
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

            {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <StripeCheckoutForm
                    amount={amount}
                    onSuccess={handleStripeSuccess}
                />
            </Elements>
            ) : (
            <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Lade Zahlungsdaten...</p>
            </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}