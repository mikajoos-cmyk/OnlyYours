// src/components/fan/PaymentModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { Loader2Icon } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Nur laden, wenn Modal offen ist und wir noch kein Secret haben oder sich der Betrag geändert hat
    if (isOpen && amount > 0) {
      setClientSecret('');
      setError(null);
      setIsLoading(true);

      const fetchPaymentIntent = async () => {
        try {
          const { data, error: functionError } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              amount: amount,
              ...metadata
            }
          });

          if (functionError) throw new Error("Verbindung zum Zahlungsserver fehlgeschlagen.");

          if (data && data.clientSecret && data.clientSecret.startsWith('pi_')) {
            setClientSecret(data.clientSecret);
          } else {
            console.error("Ungültige Antwort vom Server:", data);
            throw new Error("Zahlungsdaten konnten nicht initialisiert werden.");
          }
        } catch (err: any) {
          console.error("Fehler PaymentModal:", err);
          setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
          toast({ title: "Fehler", description: "Zahlung konnte nicht vorbereitet werden.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };

      fetchPaymentIntent();
    }
  }, [isOpen, amount, JSON.stringify(metadata)]); // Metadata als JSON String dependency, um Loops zu vermeiden

  const handleStripeSuccess = async () => {
    try {
      await onPaymentSuccess();
      onClose();
    } catch (error: any) {
      console.error("Fehler nach erfolgreicher Zahlung:", error);
      toast({ title: "Fehler", description: "Kauf bestätigt, aber Aktivierung schlug fehl.", variant: "destructive" });
    }
  };

  // WICHTIG: useMemo verhindert, dass das options-Objekt bei jedem Render neu erstellt wird.
  // Das verhindert den "match"-Fehler und Re-Render-Loops in Stripe.js.
  const stripeOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        labels: 'floating' as const,
        variables: {
          colorPrimary: '#eab308', // Dein Secondary Gold
          colorBackground: '#1a1a1a',
          colorText: '#ffffff',
          colorDanger: '#ef4444',
          fontFamily: 'Lato, sans-serif',
          spacingUnit: '4px',
          borderRadius: '8px',
        },
      }
    };
  }, [clientSecret]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto",
        "chat-messages-scrollbar"
      )}>
        <DialogHeader>
          <DialogTitle>Zahlung abschließen</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sichere Zahlung via Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <p className="mb-2 text-lg font-medium text-foreground text-center">
            {description}
          </p>
          <p className="mb-6 text-3xl font-serif text-secondary text-center font-bold">
            {amount.toFixed(2)}€
          </p>

          {error ? (
            <div className="flex flex-col items-center justify-center py-8 text-destructive text-center gap-2">
              <p>{error}</p>
              <button onClick={onClose} className="text-sm underline hover:text-destructive/80">Schließen</button>
            </div>
          ) : (clientSecret && stripeOptions) ? (
            /* WICHTIG: key={clientSecret} erzwingt eine saubere Neu-Montage, wenn sich das Secret ändert */
            <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
              <StripeCheckoutForm
                amount={amount}
                onSuccess={handleStripeSuccess}
              />
            </Elements>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2Icon className="w-8 h-8 animate-spin text-secondary" />
              <p className="text-muted-foreground text-sm">Verbindung zu Stripe...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}