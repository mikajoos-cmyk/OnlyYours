import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService'; // Unser neuer Service
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm'; // Unser neues Formular
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../hooks/use-toast';

// Interface Definitionen (beibehalten)
interface ModalTier {
  id: string;
  dbId: string | null;
  name: string;
  price: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: ModalTier;
  creatorId: string;
  creatorName: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, tier, creatorId, creatorName, onPaymentSuccess }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();

  // Sobald das Modal aufgeht, holen wir uns das Secret vom Backend
  useEffect(() => {
    if (isOpen) {
      supabase.functions.invoke('create-payment-intent', {
        body: {
            amount: tier.price,
            creatorId: creatorId,
            description: `Abo für ${tier.name}`
        }
      }).then(({ data, error }) => {
        if (data) setClientSecret(data.clientSecret);
        if (error) console.error(error);
      });
    }
  }, [isOpen, tier, creatorId]);

  const handleSuccess = async () => {
      // Hier wird die Datenbank erst nach erfolgreicher Stripe-Zahlung aktualisiert
      try {
        await subscriptionService.subscribe(creatorId, tier.dbId, tier.price);
        toast({ title: 'Zahlung erfolgreich!', description: `Abo für ${creatorName} aktiv.` });
        onPaymentSuccess();
        onClose();
      } catch (error) {
        console.error("Fehler beim Speichern des Abos:", error);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Zahlung abschließen</DialogTitle>
        </DialogHeader>

        <div className="p-4">
            <p className="mb-4 text-lg font-serif text-secondary text-center">
                {tier.price.toFixed(2)}€ / Monat
            </p>

            {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <StripeCheckoutForm
                    amount={tier.price}
                    onSuccess={handleSuccess}
                />
            </Elements>
            ) : (
            <p className="text-center text-muted-foreground">Lade Zahlungsdaten...</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}