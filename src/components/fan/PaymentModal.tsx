// src/components/fan/PaymentModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm';
import { Loader2Icon } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../hooks/use-toast';

// Erwartet jetzt dbId für das Abo
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

export default function PaymentModal({
  isOpen,
  onClose,
  tier,
  creatorId,
  creatorName,
  onPaymentSuccess
}: PaymentModalProps) {

  const [clientSecret, setClientSecret] = useState('');
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);
  const { toast } = useToast();

  // Sobald das Modal aufgeht, holen wir uns das Secret vom Backend (Edge Function)
  useEffect(() => {
    if (isOpen && tier && creatorId) {
      const createIntent = async () => {
        setIsLoadingSecret(true);
        try {
          const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
                amount: tier.price,
                creatorId: creatorId,
                description: `Abo: ${tier.name} für ${creatorName}`,
                metadata: {
                  tierId: tier.dbId,
                  tierName: tier.name
                }
            }
          });

          if (error) throw error;
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            throw new Error("Kein Client Secret erhalten");
          }
        } catch (err: any) {
          console.error("Fehler beim Laden der Zahlung:", err);
          toast({
            title: "Fehler",
            description: "Zahlungssystem konnte nicht initialisiert werden.",
            variant: "destructive"
          });
        } finally {
          setIsLoadingSecret(false);
        }
      };

      createIntent();
    }
  }, [isOpen, tier, creatorId, creatorName, toast]);

  // Wrapper für den Erfolgsfall: Erst Datenbank updaten, dann Modal schließen
  const handleSuccess = async () => {
    try {
      // 1. Abo in Supabase eintragen (nach erfolgreicher Stripe Zahlung)
      await subscriptionService.subscribe(
        creatorId,
        tier.dbId,
        tier.price
      );

      toast({
        title: 'Zahlung erfolgreich!',
        description: `Sie haben ${tier.name} für ${creatorName} abonniert.`,
      });

      // 2. UI aktualisieren
      onPaymentSuccess();
      onClose();

    } catch (error: any) {
      console.error("Fehler beim Speichern des Abos:", error);
      toast({
        title: 'Abo-Fehler',
        description: 'Zahlung war erfolgreich, aber das Abo konnte nicht gespeichert werden. Bitte Support kontaktieren.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Zahlung abschließen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background rounded-lg p-4 space-y-2 border border-border">
            <div className="flex justify-between text-foreground">
              <span>Abonnement:</span>
              <span className="font-medium">{tier.name}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Creator:</span>
              <span className="font-medium">{creatorName}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between text-foreground text-lg">
                <span className="font-medium">Gesamt:</span>
                <span className="font-serif text-secondary">{tier.price.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Stripe Elements laden */}
          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night', // Passt sich deinem Dark Mode an
                  variables: {
                    colorPrimary: '#d4af37', // Deine Secondary Farbe (Gold)
                    colorBackground: '#1a1a1a',
                    colorText: '#ffffff',
                  }
                }
              }}
            >
              <StripeCheckoutForm
                  amount={tier.price}
                  onSuccess={handleSuccess}
              />
            </Elements>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {isLoadingSecret ? (
                <>
                  <Loader2Icon className="w-8 h-8 animate-spin mb-2 text-secondary" />
                  <p>Verbindung zu Stripe wird hergestellt...</p>
                </>
              ) : (
                <p>Laden fehlgeschlagen.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}