import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CreditCardIcon, WalletIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: {
    name: string;
    price: number;
  };
  creatorName: string;
}

export default function PaymentModal({ isOpen, onClose, tier, creatorName }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const { toast } = useToast();

  const paymentMethods = [
    { id: 'stripe', name: 'Kreditkarte (Stripe)', icon: CreditCardIcon },
    { id: 'paypal', name: 'PayPal', icon: WalletIcon },
    { id: 'crypto', name: 'Kryptowährung', icon: WalletIcon },
  ];

  const handlePayment = () => {
    toast({
      title: 'Zahlung erfolgreich!',
      description: `Sie haben ${tier.name} für ${creatorName} abonniert.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Zahlung abschließen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-background rounded-lg p-4 space-y-2">
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
                <span className="font-serif text-secondary">{tier.price}€/Monat</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Zahlungsmethode wählen</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.id}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      paymentMethod === method.id
                        ? 'border-secondary bg-secondary/10'
                        : 'border-border hover:border-secondary/50'
                    }`}
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label htmlFor={method.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                      <span className="text-foreground">{method.name}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <Button
            onClick={handlePayment}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
          >
            Jetzt bezahlen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
