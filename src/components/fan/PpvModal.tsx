// src/components/fan/PpvModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2Icon, LockIcon, UserCheckIcon } from 'lucide-react'; // UserCheckIcon hinzugefügt
import { useToast } from '../../hooks/use-toast';
import { paymentService } from '../../services/paymentService';
import type { Post } from '../../services/postService';
import { Tier } from '../../services/tierService'; // Import Tier
import { cn } from '../../lib/utils'; // Import cn

interface PpvModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPaymentSuccess: (postId: string) => void;
  // --- NEUE PROPS ---
  creatorTiers: Tier[]; // Verfügbare Tiers des Creators
  onSubscribeClick: () => void; // Callback zum Öffnen des Abo-Modals
  // --- ENDE ---
}

export default function PpvModal({
    isOpen,
    onClose,
    post,
    onPaymentSuccess,
    creatorTiers,
    onSubscribeClick
}: PpvModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Finden der spezifischen Tier, die für diesen Post benötigt wird
  // (Nur relevant, wenn post.tier_id gesetzt ist)
  const requiredTier = post.tier_id ? creatorTiers.find(t => t.id === post.tier_id) : null;

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      await paymentService.purchasePost(post.id, post.creatorId, post.price);
      toast({
        title: 'Kauf erfolgreich!',
        description: 'Der Beitrag wurde freigeschaltet.',
      });
      onPaymentSuccess(post.id);
      onClose();
    } catch (error: any) {
      console.error("Fehler beim Kauf des Posts:", error);
      toast({
        title: 'Fehler bei der Zahlung',
        description: error.message || 'Der Beitrag konnte nicht gekauft werden.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = () => {
      onClose(); // PPV-Modal schließen
      // Kurze Verzögerung, damit das Abo-Modal sauber öffnet
      setTimeout(() => {
          onSubscribeClick();
      }, 150);
  };

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // --- AKTUALISIERTE LOGIK ---
  const canPpv = post.price > 0;
  // 'canSubscribe' ist wahr, wenn der Post an ein Tier gebunden ist UND dieses Tier existiert
  const canSubscribe = requiredTier !== null;
  // --- ENDE ---

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
                  alt={post.caption || ""}
                  className="w-full h-full object-cover filter blur-md" // Leichterer Blur im Modal
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

          {/* --- OPTION 1: PPV (falls Preis vorhanden) --- */}
          {canPpv && (
             <Button
                onClick={handlePurchase}
                className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 py-6 text-base font-normal"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LockIcon className="w-4 h-4 mr-2" />
                    Jetzt kaufen für {formatCurrency(post.price)}
                  </>
                )}
              </Button>
          )}

          {/* --- TRENNER (falls beide Optionen vorhanden) --- */}
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

          {/* --- OPTION 2: ABONNIEREN (falls Tier vorhanden) --- */}
          {canSubscribe && requiredTier && (
              <Button
                onClick={handleSubscribe}
                variant="outline"
                className={cn(
                    "w-full py-6 text-base font-normal",
                    canPpv // Wenn PPV geht, ist Abo 'outline'
                        ? "bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/90" // Wenn *nur* Abo geht
                )}
                disabled={isProcessing}
              >
                <UserCheckIcon className="w-4 h-4 mr-2" />
                {`Mit "${requiredTier.name}"-Abo freischalten (${formatCurrency(requiredTier.price)}/Monat)`}
              </Button>
          )}

          {/* Fallback für öffentliche Posts, die PPV sind (canSubscribe = false) */}
          {!canSubscribe && canPpv && (
             <p className="text-sm text-muted-foreground text-center">
               Dieser Beitrag ist öffentlich, kostet aber extra.
             </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}