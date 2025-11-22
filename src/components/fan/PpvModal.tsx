// src/components/fan/PpvModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { LockIcon, UserCheckIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { paymentService } from '../../services/paymentService';
import type { Post } from '../../services/postService';
import { Tier } from '../../services/tierService';
import { cn } from '../../lib/utils';
import PaymentModal from './PaymentModal'; // Importieren!

interface PpvModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPaymentSuccess: (postId: string) => void;
  creatorTiers: Tier[];
  onSubscribeClick: () => void;
}

export default function PpvModal({
    isOpen,
    onClose,
    post,
    onPaymentSuccess,
    creatorTiers,
    onSubscribeClick
}: PpvModalProps) {
  const { toast } = useToast();

  // State, um das PaymentModal zu steuern
  const [showPayment, setShowPayment] = useState(false);

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Logik Variablen
  const canPpv = post.price > 0;
  const creatorHasTiers = creatorTiers.length > 0;
  const requiredTier = post.tier_id ? creatorTiers.find(t => t.id === post.tier_id) : null;
  const cheapestTier = creatorHasTiers ? creatorTiers[0] : null;
  const canSubscribe = creatorHasTiers;

  let subscribeButtonText = "Mit Abo freischalten";
  if (requiredTier) {
    subscribeButtonText = `Mit "${requiredTier.name}"-Abo freischalten (${formatCurrency(requiredTier.price)}/Monat)`;
  } else if (cheapestTier) {
    subscribeButtonText = `Mit Abo freischalten (ab ${formatCurrency(cheapestTier.price)}/Monat)`;
  }

  // Statt direkt zu kaufen, öffnen wir das Payment Modal
  const handleInitiatePurchase = () => {
    setShowPayment(true);
  };

  // Dieser Callback wird an PaymentModal übergeben und erst nach Stripe-Erfolg ausgeführt
  const handleConfirmedPurchase = async () => {
      await paymentService.purchasePost(post.id, post.creatorId, post.price);
      toast({
        title: 'Kauf erfolgreich!',
        description: 'Der Beitrag wurde freigeschaltet.',
      });
      onPaymentSuccess(post.id);
      setShowPayment(false);
      onClose();
  };

  // Falls Payment offen ist, zeigen wir das PaymentModal statt des Auswahl-Dialogs
  if (showPayment) {
      return (
          <PaymentModal
            isOpen={true}
            onClose={() => setShowPayment(false)}
            amount={post.price}
            description={`Zugriff auf Post freischalten`}
            metadata={{
                creatorId: post.creatorId,
                postId: post.id,
                type: 'PAY_PER_VIEW'
            }}
            onPaymentSuccess={handleConfirmedPurchase}
          />
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Inhalt freischalten
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Wähle eine Option, um sofortigen Zugriff zu erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-background rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-neutral rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={post.thumbnail_url || post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover filter blur-md"
                />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-medium line-clamp-2">
                  {post.caption || "Exklusiver Beitrag"}
                </p>
                <p className="text-sm text-muted-foreground">
                  von {post.creator.name}
                </p>
              </div>
            </div>
          </div>

          {canPpv && (
             <Button
                onClick={handleInitiatePurchase} // <-- Hier rufen wir jetzt die UI-Logik auf
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
              >
                <LockIcon className="w-4 h-4 mr-2" />
                Jetzt kaufen für {formatCurrency(post.price)}
              </Button>
          )}

          {canPpv && canSubscribe && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ODER
                </span>
              </div>
            </div>
          )}

          {canSubscribe && (
              <Button
                onClick={() => { onClose(); setTimeout(onSubscribeClick, 150); }}
                variant="outline"
                className={cn(
                    "w-full py-6 text-base font-normal",
                    canPpv
                        ? "bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                )}
              >
                <UserCheckIcon className="w-4 h-4 mr-2" />
                {subscribeButtonText}
              </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}