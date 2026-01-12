// src/components/fan/SubscriptionModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckIcon, ArrowUpCircleIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';
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
  isCurrent: boolean;   // Aktiv UND Verlängerung an
  isCanceled: boolean;  // Aktiv ABER Verlängerung aus
  isUpgrade: boolean;
  isDowngrade: boolean;
  upgradePrice: number;
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

  const { subscriptionMap } = useSubscriptionStore();

  useEffect(() => {
    const activeSub = subscriptionMap.get(creator.id);
    const currentPrice = activeSub?.price || 0;
    const currentTierId = activeSub?.tierId;

    const customTiers: ModalTier[] = tiers.map(tier => {
      const isMatch = tier.id === currentTierId;
      const isActiveStatus = activeSub?.status === 'ACTIVE';
      const isAutoRenew = activeSub?.autoRenew;

      const isCurrent = isActiveStatus && isAutoRenew && isMatch;
      const isCanceled = isMatch && (!isCurrent && (isActiveStatus || activeSub?.status === 'CANCELED'));

      const priceDiff = Math.max(0, tier.price - currentPrice);
      const isUpgrade = (isActiveStatus || activeSub?.status === 'CANCELED') && (tier.price > currentPrice);
      const isDowngrade = (isActiveStatus || activeSub?.status === 'CANCELED') && (tier.price < currentPrice);

      return {
        id: tier.id,
        dbId: tier.id,
        name: tier.name,
        price: tier.price,
        benefits: (tier.benefits as string[]) || [tier.description],
        isCurrent,
        isCanceled,
        isUpgrade,
        isDowngrade,
        upgradePrice: isUpgrade ? priceDiff : tier.price
      };
    });

    setCombinedTiers(customTiers);

    if (customTiers.length > 0) {
      if (!activeSub) {
        setSelectedTierId(customTiers[0].id);
      } else {
        const canceledTier = customTiers.find(t => t.isCanceled);
        if (canceledTier) {
          setSelectedTierId(canceledTier.id);
        } else {
          const firstUpgrade = customTiers.find(t => t.isUpgrade);
          setSelectedTierId(firstUpgrade ? firstUpgrade.id : customTiers[0].id);
        }
      }
    }
  }, [tiers, creator.id, subscriptionMap]);

  const selectedTierData = combinedTiers.find((t) => t.id === selectedTierId);

  const handleConfirmedSubscription = async () => {
    if (!selectedTierData) return;

    try {
      let amountToPay = 0; // Default auf 0 für Downgrade/Resume

      // Nur bei Upgrade oder komplett neuem Abo fällt sofort eine Zahlung an
      if (selectedTierData.isUpgrade) {
        amountToPay = selectedTierData.upgradePrice;
      } else if (!selectedTierData.isCanceled && !selectedTierData.isDowngrade) {
        // Normales neues Abo
        amountToPay = selectedTierData.price;
      }

      await subscriptionService.subscribe(
        creator.id,
        selectedTierData.dbId,
        selectedTierData.price,
        amountToPay
      );

      let successMsg = `Abo für ${creator.name} ist jetzt aktiv.`;
      if (selectedTierData.isUpgrade) successMsg = `Upgrade auf ${selectedTierData.name} erfolgreich!`;
      if (selectedTierData.isCanceled) successMsg = `Abonnement erfolgreich reaktiviert!`;
      if (selectedTierData.isDowngrade) successMsg = `Wechsel auf ${selectedTierData.name} vorgemerkt.`;

      toast({ title: 'Erfolgreich!', description: successMsg });
      onSubscriptionComplete();
    } catch (error: any) {
      console.error("Fehler beim Speichern des Abos:", error);
      toast({ title: "Fehler", description: error.message || "Aktion fehlgeschlagen.", variant: "destructive" });
    }
  };

  const handleProceed = () => {
    // Modal überspringen, wenn der zu zahlende Betrag 0 ist (Downgrade oder Resume)
    if (selectedTierData?.isCanceled || selectedTierData?.isDowngrade) {
      handleConfirmedSubscription();
    } else {
      setShowPayment(true);
    }
  };

  const getButtonText = () => {
    if (!selectedTierData) return 'Weiter';
    if (selectedTierData.isUpgrade) return `Upgrade für ${selectedTierData.upgradePrice.toFixed(2)}€ bestätigen`;
    if (selectedTierData.isDowngrade) return `Auf ${selectedTierData.name} wechseln`;
    if (selectedTierData.isCanceled) return 'Abonnement reaktivieren';
    return 'Weiter zur Zahlung';
  };

  if (showPayment && selectedTierData) {
    let descriptionText = `Abonnement: ${selectedTierData.name}`;
    let paymentAmount = selectedTierData.price;

    if (selectedTierData.isUpgrade) {
      descriptionText = `Upgrade auf ${selectedTierData.name} (Differenzzahlung)`;
      paymentAmount = selectedTierData.upgradePrice;
    }

    return (
      <PaymentModal
        isOpen={isOpen}
        onClose={onClose}
        amount={paymentAmount}
        description={descriptionText}
        metadata={{
          creatorId: creator.id,
          tierId: selectedTierData.dbId,
          type: 'SUBSCRIPTION',
          isUpgrade: selectedTierData.isUpgrade
        }}
        onPaymentSuccess={handleConfirmedSubscription}
      />
    );
  }

  const activeSub = subscriptionMap.get(creator.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-2xl chat-messages-scrollbar max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Abonnement verwalten
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
                  tier.isCurrent ? 'opacity-70 cursor-default border-success/30 bg-success/5' : '',
                  tier.isCanceled ? 'border-warning/50 bg-warning/5' : ''
                )}
                onClick={() => !tier.isCurrent && setSelectedTierId(tier.id)}
              >
                <div className="flex items-start gap-4">
                  <RadioGroupItem
                    value={tier.id}
                    id={tier.id}
                    className="mt-1"
                    disabled={tier.isCurrent}
                  />
                  <Label htmlFor={tier.id} className={cn("flex-1", !tier.isCurrent && "cursor-pointer")}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-serif text-foreground">{tier.name}</h3>
                            {tier.isCurrent && (
                              <span className="bg-success/20 text-success text-xs px-2 py-1 rounded-full font-sans uppercase tracking-wider flex items-center gap-1">
                                <CheckIcon className="w-3 h-3" /> Aktiv
                              </span>
                            )}
                            {tier.isCanceled && (
                              <span className="bg-warning/20 text-warning text-xs px-2 py-1 rounded-full font-sans uppercase tracking-wider flex items-center gap-1">
                                <AlertCircleIcon className="w-3 h-3" /> Läuft aus
                              </span>
                            )}
                            {tier.isUpgrade && (
                              <span className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full font-sans uppercase tracking-wider flex items-center gap-1">
                                <ArrowUpCircleIcon className="w-3 h-3" /> Upgrade
                              </span>
                            )}
                          </div>
                          {tier.isCanceled && activeSub?.endDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Zugriff bis: {new Date(activeSub.endDate).toLocaleDateString()}
                            </p>
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
                          Hinweis: Dies ist eine niedrigere Stufe. Änderungen werden am Ende des laufenden Abrechnungszeitraums wirksam.
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
          {selectedTierData?.isCanceled && <RefreshCwIcon className="w-4 h-4 mr-2" />}
          {getButtonText()}
        </Button>
      </DialogContent>
    </Dialog>
  );
}