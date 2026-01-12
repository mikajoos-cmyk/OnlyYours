import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../services/stripeService';
import { supabase } from '../../lib/supabase';
import StripeCheckoutForm from './StripeCheckoutForm';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { Loader2Icon, CreditCardIcon, PlusIcon, CheckCircle2Icon } from 'lucide-react';
import { paymentService, SavedPaymentMethod } from '../../services/paymentService';
import { Button } from '../ui/button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  metadata: any;
  onPaymentSuccess: () => Promise<void>;
}

function PaymentModalContent({
  isOpen,
  onClose,
  amount,
  description,
  metadata,
  onPaymentSuccess
}: PaymentModalProps) {
  const { toast } = useToast();
  const stripe = useStripe();

  const [view, setView] = useState<'select-method' | 'add-new'>('select-method');
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMethods();
    }
  }, [isOpen]);

  const loadMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const methods = await paymentService.getSavedPaymentMethods();
      setSavedMethods(methods);
      const defaultMethod = methods.find(m => m.isDefault) || methods[0];
      if (defaultMethod) setSelectedMethodId(defaultMethod.id);

      if (methods.length === 0) {
        setView('add-new');
        prepareNewCardFlow();
      } else {
        setView('select-method');
      }
    } catch (e) {
      console.error(e);
      setView('add-new');
      prepareNewCardFlow();
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const prepareNewCardFlow = async () => {
    try {
      if (metadata.type === 'SUBSCRIPTION') {
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: {
            creatorId: metadata.creatorId,
            tierId: metadata.tierId
          }
        });
        if (error) throw error;
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      } else {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { amount, ...metadata, setupFutureUsage: true }
        });
        if (error) throw error;
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      }
    } catch (e: any) {
      console.error("Error preparing flow:", e);
      toast({ title: "Fehler", description: "Konnte Zahlung nicht vorbereiten.", variant: "destructive" });
    }
  };

  const handlePayWithSavedCard = async () => {
    if (!selectedMethodId || !stripe) return;
    setIsProcessing(true);

    try {
      let resultClientSecret = null;
      const returnUrl = window.location.href;

      if (metadata.type === 'SUBSCRIPTION') {
        // --- ABO ---
        const { data, error } = await supabase.functions.invoke('create-subscription', {
          body: {
            creatorId: metadata.creatorId,
            tierId: metadata.tierId,
            paymentMethodId: selectedMethodId
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // FIX: Prüfe, ob WIRKLICH Action nötig ist, oder ob es ein Fehler/Decline war
        if (data.status === 'incomplete') {
          if (['requires_action', 'requires_source_action'].includes(data.paymentIntentStatus)) {
            // 3D Secure nötig
            resultClientSecret = data.clientSecret;
          } else {
            // Anderer Status (z.B. requires_payment_method -> abgelehnt)
            // Hier nutzen wir jetzt die echte Fehlermeldung von Stripe (z.B. "Your card was declined.")
            const msg = data.errorMessage || "Zahlung wurde abgelehnt oder ist fehlgeschlagen.";
            throw new Error(msg);
          }
        }

      } else {
        // --- EINMALZAHLUNG ---
        const { data, error } = await supabase.functions.invoke('charge-saved-card', {
          body: {
            paymentMethodId: selectedMethodId,
            amount,
            metadata,
            returnUrl
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Backend sendet 'requiresAction' nur, wenn es wirklich nötig ist.
        if (data.requiresAction && data.clientSecret) {
          resultClientSecret = data.clientSecret;
        }
      }

      // 3. Nur ausführen, wenn wir ein gültiges Secret für eine Action haben
      if (resultClientSecret) {
        const { error: stripeError } = await stripe.handleNextAction({
          clientSecret: resultClientSecret
        });

        if (stripeError) {
          throw new Error(stripeError.message || "Bestätigung fehlgeschlagen");
        }
      }

      // 4. Erfolg!
      await onPaymentSuccess();
      onClose();
      toast({ title: "Zahlung erfolgreich!", description });

    } catch (error: any) {
      console.error(error);
      toast({ title: "Zahlung fehlgeschlagen", description: error.message || "Bitte Methode prüfen.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCardSuccess = async () => {
    await onPaymentSuccess();
    onClose();
  };

  const stripeOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: { theme: 'night' as const, variables: { colorPrimary: '#eab308' } }
    };
  }, [clientSecret]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md max-h-[90vh] overflow-y-auto chat-messages-scrollbar">
        <DialogHeader>
          <DialogTitle>Zahlung abschließen</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-6">
          <div className="text-center">
            <span className="text-3xl font-serif text-secondary font-bold">{amount.toFixed(2)}€</span>
          </div>

          {view === 'select-method' && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Gespeicherte Methode wählen:</p>
              <div className="space-y-2">
                {savedMethods.map(method => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
                      selectedMethodId === method.id ? "border-secondary bg-secondary/10" : "border-border hover:bg-neutral"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground w-8 flex justify-center">
                        {method.icon === 'paypal' ? <span className="font-bold text-xs text-[#003087]">PP</span> :
                          method.icon === 'klarna' ? <span className="font-bold text-xs text-[#FFB3C7]">Kl.</span> :
                            method.icon === 'bank' ? <span className="font-bold text-xs">Bank</span> :
                              method.icon === 'wallet' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" /></svg>
                              ) : (
                                <CreditCardIcon className="w-5 h-5" />
                              )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize flex items-center gap-2">
                          {method.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{method.subLabel}</p>
                      </div>
                    </div>
                    {selectedMethodId === method.id && <CheckCircle2Icon className="w-5 h-5 text-secondary" />}
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePayWithSavedCard}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6"
                disabled={isProcessing || !selectedMethodId}
              >
                {isProcessing ? <Loader2Icon className="animate-spin mr-2" /> : 'Jetzt bezahlen'}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder</span></div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setView('add-new'); prepareNewCardFlow(); }}
              >
                <PlusIcon className="w-4 h-4 mr-2" /> Neue Zahlungsmethode
              </Button>
            </div>
          )}

          {view === 'add-new' && (
            <div className="space-y-4">
              {clientSecret ? (
                <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
                  <StripeCheckoutForm amount={amount} onSuccess={handleNewCardSuccess} />
                </Elements>
              ) : (
                <div className="flex justify-center py-4"><Loader2Icon className="animate-spin" /></div>
              )}

              {savedMethods.length > 0 && (
                <Button variant="ghost" onClick={() => setView('select-method')} className="w-full mt-2">
                  Zurück zu gespeicherten Methoden
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentModal(props: PaymentModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentModalContent {...props} />
    </Elements>
  );
}