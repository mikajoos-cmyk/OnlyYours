import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DollarSignIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import PaymentModal from './PaymentModal';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: { id: string; name: string; };
  onTipSuccess: (amount: number) => void;
}

export default function TipModal({ isOpen, onClose, creator, onTipSuccess }: TipModalProps) {
  const [amount, setAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();
  const presetAmounts = [5, 10, 20];

  const handleInitiateTip = () => {
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount <= 0.50) {
      toast({ title: 'Ungültiger Betrag', description: 'Mindestens 0.50€.', variant: 'destructive' });
      return;
    }
    setShowPayment(true);
  };

  const handleConfirmedTip = async () => {
    // Kein manueller DB-Insert mehr nötig! Webhook macht das.
    onTipSuccess(parseFloat(amount));
    setShowPayment(false);
    onClose();
  };

  if (showPayment) {
    return (
      <PaymentModal
        isOpen={true}
        onClose={() => setShowPayment(false)}
        amount={parseFloat(amount)}
        description={`Trinkgeld für ${creator.name}`}
        metadata={{ creatorId: creator.id, creatorName: creator.name, type: 'TIP' }}
        onPaymentSuccess={handleConfirmedTip}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">Trinkgeld senden</DialogTitle>
          <DialogDescription className="text-muted-foreground">Unterstützen Sie {creator.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex justify-center gap-2">
            {presetAmounts.map((preset) => (
              <Button key={preset} variant="outline" onClick={() => setAmount(preset.toFixed(2))}>{preset.toFixed(2)}€</Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tip-amount">Oder Betrag eingeben:</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input id="tip-amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7 bg-background border-border" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleInitiateTip} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6" disabled={!amount}>
            <DollarSignIcon className="w-4 h-4 mr-2" /> Weiter zur Zahlung
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}