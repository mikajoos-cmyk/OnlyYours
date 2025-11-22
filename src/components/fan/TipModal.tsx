import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DollarSignIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { paymentService } from '../../services/paymentService';
import PaymentModal from './PaymentModal'; // PaymentModal importieren

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    id: string;
    name: string;
  };
  onTipSuccess: (amount: number) => void;
}

export default function TipModal({ isOpen, onClose, creator, onTipSuccess }: TipModalProps) {
  const [amount, setAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false); // Steuert das PaymentModal
  const { toast } = useToast();
  const presetAmounts = [5, 10, 20];

  // Validiert den Betrag und öffnet das Zahlungsfenster
  const handleInitiateTip = () => {
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount <= 0.50) {
      toast({
        title: 'Ungültiger Betrag',
        description: 'Bitte geben Sie einen Betrag von mindestens 0.50€ ein.',
        variant: 'destructive',
      });
      return;
    }
    setShowPayment(true);
  };

  // Wird erst ausgeführt, NACHDEM Stripe die Zahlung bestätigt hat
  const handleConfirmedTip = async () => {
    const tipAmount = parseFloat(amount);
    try {
      // Transaktion in der Datenbank speichern
      await paymentService.sendTip(creator.id, tipAmount);

      // Callback aufrufen (z.B. für Konfetti oder Chat-Nachricht)
      onTipSuccess(tipAmount);

      setShowPayment(false);
      onClose();
    } catch (error: any) {
      console.error("Fehler beim Speichern des Trinkgelds:", error);
      throw error; // Fehler weiterwerfen, damit PaymentModal ihn fangen kann
    }
  };

  // Wenn der User auf "Senden" geklickt hat, zeigen wir das PaymentModal
  if (showPayment) {
    return (
      <PaymentModal
        isOpen={true}
        onClose={() => setShowPayment(false)}
        amount={parseFloat(amount)}
        description={`Trinkgeld für ${creator.name}`}
        metadata={{
            creatorId: creator.id,
            type: 'TIP'
        }}
        onPaymentSuccess={handleConfirmedTip}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Trinkgeld senden
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Unterstützen Sie {creator.name} mit einem Trinkgeld.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center gap-2">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                className="bg-background border-border text-foreground hover:bg-neutral"
                onClick={() => setAmount(preset.toFixed(2))}
              >
                {preset.toFixed(2)}€
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tip-amount" className="text-foreground">Oder Betrag eingeben:</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="tip-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-background text-foreground border-border"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleInitiateTip}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
            disabled={!amount}
          >
            <DollarSignIcon className="w-4 h-4 mr-2" />
            {`Weiter zur Zahlung (${parseFloat(amount || '0').toFixed(2)}€)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}