// src/components/fan/SubscriptionModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import PaymentModal from './PaymentModal';
import type { Tier } from '../../services/tierService';
import type { Json } from '../../lib/database.types';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../hooks/use-toast';

interface ModalTier {
  id: string;
  dbId: string | null;
  name: string;
  price: number;
  benefits: (string | Json)[];
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    id: string;
    name: string;
  };
  tiers: Tier[];
  onSubscriptionComplete: () => void;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  creator,
  tiers,
  onSubscriptionComplete
}: SubscriptionModalProps) {

  const [showPayment, setShowPayment] = useState(false);
  const [combinedTiers, setCombinedTiers] = useState<ModalTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const customTiers: ModalTier[] = tiers.map(tier => ({
      id: tier.id,
      dbId: tier.id,
      name: tier.name,
      price: tier.price,
      benefits: (tier.benefits as string[]) || [tier.description],
    }));

    setCombinedTiers(customTiers);

    if (customTiers.length > 0) {
      setSelectedTierId(customTiers[0].id);
    }

  }, [tiers]);

  const handleProceed = () => {
    setShowPayment(true);
  };

  const selectedTierData = combinedTiers.find((t) => t.id === selectedTierId);

  // Callback für den erfolgreichen Abschluss der Stripe-Zahlung
  const handleConfirmedSubscription = async () => {
      if (!selectedTierData) return;

      try {
        await subscriptionService.subscribe(creator.id, selectedTierData.dbId, selectedTierData.price);
        toast({ title: 'Zahlung erfolgreich!', description: `Abo für ${creator.name} ist jetzt aktiv.` });
        onSubscriptionComplete();
      } catch (error) {
        console.error("Fehler beim Speichern des Abos:", error);
        throw error; // Fehler weiterwerfen, damit PaymentModal ihn fangen kann
      }
  };

  if (showPayment && selectedTierData) {
    return (
      <PaymentModal
        isOpen={isOpen}
        onClose={onClose}
        amount={selectedTierData.price}
        description={`Abonnement: ${selectedTierData.name} bei ${creator.name}`}
        metadata={{
            creatorId: creator.id,
            tierId: selectedTierData.dbId,
            type: 'SUBSCRIPTION'
        }}
        onPaymentSuccess={handleConfirmedSubscription}
      />
    );
  }

  // Verhindert Absturz, wenn Modal geöffnet wird, bevor Tiers geladen sind
  if (!selectedTierData && combinedTiers.length > 0) {
      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Abonnement wählen
          </DialogTitle>
        </DialogHeader>

        {combinedTiers.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            Dieser Creator bietet derzeit keine Abonnements an.
          </p>
        ) : (
          <RadioGroup value={selectedTierId} onValueChange={setSelectedTierId} className="space-y-4">
            {combinedTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                  selectedTierId === tier.id
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
                          {tier.price.toFixed(2)}€<span className="text-sm text-muted-foreground">/Monat</span>
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {tier.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2 text-foreground">
                            <CheckIcon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" strokeWidth={2} />
                            <span>{String(benefit)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}

        <Button
          onClick={handleProceed}
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
          disabled={combinedTiers.length === 0 || !selectedTierData}
        >
          Weiter zur Zahlung
        </Button>
      </DialogContent>
    </Dialog>
  );
}