// src/components/fan/PpvModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2Icon, LockIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { paymentService } from '../../services/paymentService';
import type { Post } from '../../services/postService';

interface PpvModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPaymentSuccess: (postId: string) => void; // Callback
}

export default function PpvModal({ isOpen, onClose, post, onPaymentSuccess }: PpvModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      // Rufen Sie den Payment Service auf, um den Kauf zu simulieren
      await paymentService.purchasePost(post.id, post.creatorId, post.price);

      toast({
        title: 'Kauf erfolgreich!',
        description: 'Der Beitrag wurde freigeschaltet.',
      });

      onPaymentSuccess(post.id); // Meldet dem Store, dass der Post gekauft wurde
      onClose(); // Schließt das Modal

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

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground">
            Inhalt freischalten
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Kaufen Sie diesen Beitrag, um sofortigen Zugriff zu erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-background rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-neutral rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={post.thumbnail_url || post.mediaUrl}
                  alt="Vorschau"
                  className="w-full h-full object-cover filter blur-sm" // Verpixelte Vorschau
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
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between text-foreground text-lg">
                <span className="font-medium">Einmaliger Preis:</span>
                <span className="font-serif text-secondary">{formatCurrency(post.price)}</span>
              </div>
            </div>
          </div>

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
        </div>
      </DialogContent>
    </Dialog>
  );
}