import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import PaymentModal from './PaymentModal';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    name: string;
    subscriptionPrice: number;
  };
}

export default function SubscriptionModal({ isOpen, onClose, creator }: SubscriptionModalProps) {
  const [selectedTier, setSelectedTier] = useState('vip');
  const [showPayment, setShowPayment] = useState(false);

  const tiers = [
    {
      id: 'vip',
      name: 'VIP',
      price: creator.subscriptionPrice,
      benefits: [
        'Zugang zu allen exklusiven Inhalten',
        'Monatliche Live-Sessions',
        'Direktnachrichten',
        'Exklusive Stories',
      ],
    },
    {
      id: 'vip-gold',
      name: 'VIP Gold',
      price: creator.subscriptionPrice * 2,
      benefits: [
        'Alle VIP-Vorteile',
        'Wöchentliche persönliche Videos',
        'Prioritäts-Support',
        'Früher Zugang zu neuen Inhalten',
        'Monatliches Überraschungsgeschenk',
      ],
    },
  ];

  const handleProceed = () => {
    setShowPayment(true);
  };

  if (showPayment) {
    return (
      <PaymentModal
        isOpen={isOpen}
        onClose={onClose}
        tier={tiers.find((t) => t.id === selectedTier)!}
        creatorName={creator.name}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Abonnement wählen
          </DialogTitle>
        </DialogHeader>

        <RadioGroup value={selectedTier} onValueChange={setSelectedTier} className="space-y-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                selectedTier === tier.id
                  ? 'border-secondary bg-secondary/10'
                  : 'border-border hover:border-secondary/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <RadioGroupItem value={tier.id} id={tier.id} className="mt-1" />
                <Label htmlFor={tier.id} className="flex-1 cursor-pointer">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-serif text-foreground">{tier.name}</h3>
                      <span className="text-2xl font-serif text-secondary">
                        {tier.price}€<span className="text-sm text-muted-foreground">/Monat</span>
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-foreground">
                          <CheckIcon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" strokeWidth={2} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Label>
              </div>
            </div>
          ))}
        </RadioGroup>

        <Button
          onClick={handleProceed}
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
        >
          Weiter zur Zahlung
        </Button>
      </DialogContent>
    </Dialog>
  );
}
