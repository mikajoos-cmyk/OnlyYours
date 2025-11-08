// src/components/fan/SubscriptionModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import PaymentModal from './PaymentModal';
import type { Tier } from '../../services/tierService'; // Import Tier-Typ
import type { Json } from '../../lib/database.types'; // Import Json Typ

// Definiert, wie ein Tier-Objekt im Modal intern aussieht
interface ModalTier {
  id: string; // Eindeutige ID für den Radio-Button (tier-uuid)
  dbId: string | null; // Die ID, die an den PaymentService geht
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
  // --- PROPS GEÄNDERT ---
  tiers: Tier[]; // Die vom Creator erstellten Tiers (Basis-Preis entfernt)
  // ---
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
  const [selectedTierId, setSelectedTierId] = useState<string>(''); // Default ist leer

  useEffect(() => {
    // --- STANDARD-ABO ENTFERNT ---

    // 1. Wandle DB-Tiers in ModalTiers um
    const customTiers: ModalTier[] = tiers.map(tier => ({
      id: tier.id,
      dbId: tier.id, // Die echte Tier-ID
      name: tier.name,
      price: tier.price,
      benefits: (tier.benefits as string[]) || [tier.description], // Fallback auf Beschreibung
    }));

    setCombinedTiers(customTiers);

    // Setze das Standard-Tier (das erste in der Liste)
    if (customTiers.length > 0) {
      setSelectedTierId(customTiers[0].id);
    }

  }, [tiers]); // Neu berechnen, wenn sich Tiers ändern
  // --- ENDE DYNAMISCHE TIERS ---


  const handleProceed = () => {
    setShowPayment(true);
  };

  const selectedTierData = combinedTiers.find((t) => t.id === selectedTierId);

  // --- WICHTIG: PaymentModal nur öffnen, wenn ein Tier ausgewählt wurde ---
  if (showPayment && selectedTierData) {
    return (
      <PaymentModal
        isOpen={isOpen}
        onClose={onClose}
        // Übergibt das ausgewählte Tier-Objekt (mit dbId)
        tier={selectedTierData}
        creatorId={creator.id}
        creatorName={creator.name}
        onPaymentSuccess={onSubscriptionComplete}
      />
    );
  }

  // Verhindert Absturz, wenn Modal geöffnet wird, bevor Tiers geladen sind
  if (!selectedTierData && combinedTiers.length > 0) {
      // Warten, bis selectedTierId (im useEffect) gesetzt ist
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

        {/* --- FALLBACK-MELDUNG, WENN KEINE TIERS EXISTIEREN --- */}
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
          // Deaktivieren, wenn keine Tiers oder keins ausgewählt
          disabled={combinedTiers.length === 0 || !selectedTierData}
        >
          Weiter zur Zahlung
        </Button>
      </DialogContent>
    </Dialog>
  );
}