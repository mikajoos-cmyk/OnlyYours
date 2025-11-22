// src/components/fan/SubscriptionModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckIcon, ArrowUpCircleIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import PaymentModal from './PaymentModal';
import type { Tier } from '../../services/tierService';
import type { Json } from '../../lib/database.types';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../hooks/use-toast';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { cn } from '../../lib/utils';

interface ModalTier {
  id: string;
  dbId: string | null;
  name: string;
  price: number;
  benefits: (string | Json)[];
  // Neue Felder für die UI-Logik
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  upgradePrice: number; // Der zu zahlende Differenzbetrag
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

  // Wir holen uns die aktuellen Abos aus dem Store
  const { subscriptionMap } = useSubscriptionStore();

  useEffect(() => {
    // Prüfen, ob wir bereits ein Abo bei diesem Creator haben
    const activeSub = subscriptionMap.get(creator.id);
    const currentPrice = activeSub?.price || 0;
    const currentTierId = activeSub?.tierId;

    // Tiers verarbeiten und Status berechnen
    const customTiers: ModalTier[] = tiers.map(tier => {
      const isCurrent = (activeSub?.status === 'ACTIVE') && (tier.id === currentTierId);

      // Berechne Differenz (einfache Logik: Neuer Preis - Alter Preis)
      // Hinweis: Echte Proration (zeitanteilig) macht Stripe im Backend,
      // hier simulieren wir den Upgrade-Preis für die UI.
      const priceDiff = Math.max(0, tier.price - currentPrice);

      const isUpgrade = (activeSub?.status === 'ACTIVE') && (tier.price > currentPrice);
      const isDowngrade = (activeSub?.status === 'ACTIVE') && (tier.price < currentPrice);

      return {
        id: tier.id,
        dbId: tier.id,
        name: tier.name,
        price: tier.price,
        benefits: (tier.benefits as string[]) || [tier.description],
        isCurrent,
        isUpgrade,
        isDowngrade,
        upgradePrice: isUpgrade ? priceDiff : tier.price
      };
    });

    setCombinedTiers(customTiers);

    // Standard-Auswahl setzen
    if (customTiers.length > 0) {
      // Wenn wir ein Abo haben, wählen wir nichts vor oder das nächsthöhere
      // Wenn nicht, das erste (günstigste)
      if (!activeSub) {
          setSelectedTierId(customTiers[0].id);
      } else {
          // Optional: Wenn Upgrade verfügbar, wähle das erste Upgrade vor
          const firstUpgrade = customTiers.find(t => t.isUpgrade);
          if (firstUpgrade) setSelectedTierId(firstUpgrade.id);
      }
    }

  }, [tiers, creator.id, subscriptionMap]);

  const handleProceed = () => {
    setShowPayment(true);
  };

  const selectedTierData = combinedTiers.find((t) => t.id === selectedTierId);

  // Callback für den erfolgreichen Abschluss der Stripe-Zahlung
  const handleConfirmedSubscription = async () => {
      if (!selectedTierData) return;

      try {
        // Wir übergeben den (möglicherweise reduzierten) Preis
        await subscriptionService.subscribe(
            creator.id,
            selectedTierData.dbId,
            selectedTierData.isUpgrade ? selectedTierData.upgradePrice : selectedTierData.price
        );

        const successMsg = selectedTierData.isUpgrade
            ? `Upgrade auf ${selectedTierData.name} erfolgreich!`
            : `Abo für ${creator.name} ist jetzt aktiv.`;

        toast({ title: 'Erfolgreich!', description: successMsg });
        onSubscriptionComplete();
      } catch (error) {
        console.error("Fehler beim Speichern des Abos:", error);
        throw error;
      }
  };

  if (showPayment && selectedTierData) {
    // Bestimme den Text für das Payment Modal
    let descriptionText = `Abonnement: ${selectedTierData.name}`;
    if (selectedTierData.isUpgrade) {
        descriptionText = `Upgrade auf ${selectedTierData.name} (Differenzzahlung)`;
    }

    return (
      <PaymentModal
        isOpen={isOpen}
        onClose={onClose}
        amount={selectedTierData.isUpgrade ? selectedTierData.upgradePrice : selectedTierData.price}
        description={descriptionText}
        metadata={{
            creatorId: creator.id,
            tierId: selectedTierData.dbId,
            type: 'SUBSCRIPTION',
            isUpgrade: selectedTierData.isUpgrade // Info ans Backend senden
        }}
        onPaymentSuccess={handleConfirmedSubscription}
      />
    );
  }

  // Verhindert Absturz, wenn Modal geöffnet wird, bevor Tiers geladen sind
  if (!selectedTierData && combinedTiers.length > 0 && !selectedTierId) {
      // Rendern erlauben, aber Button deaktivieren
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Scrollbar Klasse hinzugefügt */}
      <DialogContent className="bg-card text-card-foreground border-border max-w-2xl chat-messages-scrollbar max-h-[90vh] overflow-y-auto">
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
                className={cn(
                    "relative rounded-lg border-2 p-6 cursor-pointer transition-all",
                    selectedTierId === tier.id ? 'border-secondary bg-secondary/10' : 'border-border hover:border-secondary/50',
                    tier.isCurrent ? 'opacity-70 cursor-default border-neutral' : ''
                )}
                onClick={() => !tier.isCurrent && setSelectedTierId(tier.id)}
              >
                <div className="flex items-start gap-4">
                  <RadioGroupItem
                    value={tier.id}
                    id={tier.id}
                    className="mt-1"
                    disabled={tier.isCurrent} // Aktuelles Abo nicht erneut wählbar
                  />
                  <Label htmlFor={tier.id} className={cn("flex-1", !tier.isCurrent && "cursor-pointer")}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-serif text-foreground">{tier.name}</h3>
                            {tier.isCurrent && (
                                <span className="bg-neutral text-muted-foreground text-xs px-2 py-1 rounded-full font-sans uppercase tracking-wider">
                                    Aktuell
                                </span>
                            )}
                            {tier.isUpgrade && (
                                <span className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full font-sans uppercase tracking-wider flex items-center gap-1">
                                    <ArrowUpCircleIcon className="w-3 h-3" /> Upgrade
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            {tier.isUpgrade ? (
                                <>
                                    <span className="text-2xl font-serif text-secondary">
                                        {tier.upgradePrice.toFixed(2)}€
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        (+ {tier.upgradePrice.toFixed(2)}€ Differenz)
                                    </p>
                                </>
                            ) : (
                                <span className="text-2xl font-serif text-secondary">
                                    {tier.price.toFixed(2)}€<span className="text-sm text-muted-foreground">/Monat</span>
                                </span>
                            )}
                        </div>
                      </div>

                      <ul className="space-y-2">
                        {tier.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2 text-foreground">
                            <CheckIcon className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" strokeWidth={2} />
                            <span>{String(benefit)}</span>
                          </li>
                        ))}
                      </ul>

                      {tier.isDowngrade && (
                          <p className="text-xs text-warning mt-2">
                              Hinweis: Dies ist eine niedrigere Stufe. Änderungen werden am Ende des Abrechnungszeitraums wirksam.
                          </p>
                      )}
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
          disabled={combinedTiers.length === 0 || !selectedTierData || selectedTierData.isCurrent}
        >
          {selectedTierData?.isUpgrade
            ? `Upgrade für ${selectedTierData.upgradePrice.toFixed(2)}€ bestätigen`
            : 'Weiter zur Zahlung'
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}