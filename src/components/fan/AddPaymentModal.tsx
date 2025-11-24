import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeSetupForm from './StripeSetupForm';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPaymentMethodModal({ isOpen, onClose, onSuccess }: AddPaymentMethodModalProps) {
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Setup Intent vom Backend holen
      supabase.functions.invoke('create-setup-intent')
        .then(({ data, error }) => {
          if (data) setClientSecret(data.clientSecret);
          if (error) {
            console.error("Fehler beim Laden des Setup Intents:", error);
            toast({ title: "Fehler", description: "Verbindung zu Stripe fehlgeschlagen.", variant: "destructive" });
          }
        });
    }
  }, [isOpen]);

  const handleSetupSuccess = () => {
    toast({ title: "Erfolg", description: "Zahlungsmethode wurde hinzugefügt." });
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
          "bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto chat-messages-scrollbar"
      )}>
        <DialogHeader>
          <DialogTitle>Neue Karte hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="p-4">
            {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <StripeSetupForm onSuccess={handleSetupSuccess} />
            </Elements>
            ) : (
            <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Lade Formular...</p>
            </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}