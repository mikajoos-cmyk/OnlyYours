import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { LockIcon, UserCheckIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import type { Post } from '../../services/postService';
import { Tier } from '../../services/tierService';
import { cn } from '../../lib/utils';
import PaymentModal from './PaymentModal';

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
  const [showPayment, setShowPayment] = useState(false);

  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;

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

  const handleInitiatePurchase = () => {
    setShowPayment(true);
  };

  const handleConfirmedPurchase = async () => {
    // WICHTIG: Kein manuelles paymentService.purchasePost() mehr!
    // Der Webhook (stripe-webhook) trägt die Zahlung in die DB ein.
    onPaymentSuccess(post.id); // Optimistisches Update im Frontend Store
    setShowPayment(false);
    onClose();
  };

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
          postCaption: post.caption?.substring(0, 50) || 'Post',
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
          <DialogTitle className="text-2xl font-serif text-foreground">Inhalt freischalten</DialogTitle>
          <DialogDescription className="text-muted-foreground">Wähle eine Option für sofortigen Zugriff.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-background rounded-lg p-4 flex items-center gap-3">
            <div className="w-20 h-20 bg-neutral rounded-md overflow-hidden flex-shrink-0">
              <img src={post.thumbnail_url || post.mediaUrl} alt="" className="w-full h-full object-cover filter blur-md" />
            </div>
            <div className="flex-1">
              <p className="text-foreground font-medium line-clamp-2">{post.caption || "Exklusiver Beitrag"}</p>
              <p className="text-sm text-muted-foreground">von {post.creator.name}</p>
            </div>
          </div>
          {canPpv && (
            <Button onClick={handleInitiatePurchase} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal">
              <LockIcon className="w-4 h-4 mr-2" /> Jetzt kaufen für {formatCurrency(post.price)}
            </Button>
          )}
          {canPpv && canSubscribe && (
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ODER</span></div></div>
          )}
          {canSubscribe && (
            <Button onClick={() => { onClose(); setTimeout(onSubscribeClick, 150); }} variant="outline" className="w-full py-6 text-base font-normal">
              <UserCheckIcon className="w-4 h-4 mr-2" /> {subscribeButtonText}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}