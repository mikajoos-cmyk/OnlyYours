// src/components/creator/StreamConfigModal.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2Icon, LockIcon, UsersIcon, RadioIcon, GlobeIcon } from 'lucide-react'; // GlobeIcon hinzugefügt
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { tierService, Tier } from '../../services/tierService';
import { useNavigate } from 'react-router-dom';

interface StreamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StreamConfigModal({ isOpen, onClose }: StreamConfigModalProps) {
  const { user, updateProfile } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [isStartingStream, setIsStartingStream] = useState(false);

  // 'public', 'all_subs', oder eine Tier-UUID
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<string>('all_subs');

  // Lade Tiers, wenn das Modal geöffnet wird
  useEffect(() => {
    if (isOpen && user?.id) {
      setLoadingTiers(true);
      tierService.getCreatorTiers(user.id)
        .then(fetchedTiers => {
          setTiers(fetchedTiers || []);

          // Setze den Standardwert basierend auf den gespeicherten Werten des Benutzers
          if (user.live_stream_requires_subscription === false) {
            setSelectedAccessLevel('public');
          } else if (user.live_stream_tier_id) {
            setSelectedAccessLevel(user.live_stream_tier_id);
          } else {
            setSelectedAccessLevel('all_subs');
          }
        })
        .catch(err => {
          console.error("Fehler beim Laden der Tiers:", err);
          toast({ title: "Fehler", description: "Abo-Stufen konnten nicht geladen werden.", variant: "destructive" });
        })
        .finally(() => setLoadingTiers(false));
    }
  }, [isOpen, user?.id, user?.live_stream_tier_id, user?.live_stream_requires_subscription, toast]);

  const handleStartStream = async () => {
    if (!user) return;

    setIsStartingStream(true);
    try {
      // 1. Logik für die Zugriffssteuerung
      const requiresSub = selectedAccessLevel !== 'public';
      const tierId = (selectedAccessLevel !== 'public' && selectedAccessLevel !== 'all_subs')
        ? selectedAccessLevel
        : null;

      // 2. Speichere die Einstellungen UND setze is_live=true
      await updateProfile({
        live_stream_requires_subscription: requiresSub,
        live_stream_tier_id: tierId,
        is_live: true,
      });

      toast({
        title: "Stream wird gestartet...",
        description: "Du wirst zur Live-Ansicht weitergeleitet.",
      });

      // 4. Schließe das Modal und navigiere zur Live-Seite
      onClose();
      navigate('/live'); // Navigiert zur Creator-Ansicht von /live

    } catch (error: any) {
      toast({ title: "Fehler", description: "Stream konnte nicht konfiguriert werden: " + error.message, variant: "destructive" });
    } finally {
      setIsStartingStream(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Live-Stream konfigurieren</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Lege fest, wer deinen nächsten Stream sehen kann, bevor du live gehst.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stream-access" className="text-foreground">
              Wer kann zusehen?
            </Label>
            <Select
              value={selectedAccessLevel}
              onValueChange={setSelectedAccessLevel}
              disabled={loadingTiers || isStartingStream}
            >
              <SelectTrigger className="bg-background text-foreground border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                {/* NEUE OPTION: Öffentlch */}
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <GlobeIcon className="w-4 h-4" />
                    Öffentlich (Jeder)
                  </div>
                </SelectItem>
                <SelectItem value="all_subs">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    Alle Abonnenten
                  </div>
                </SelectItem>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <div className="flex items-center gap-2">
                      <LockIcon className="w-4 h-4" />
                      Nur {tier.name} (Stufe)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingTiers && <p className="text-xs text-muted-foreground">Lade Abo-Stufen...</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="bg-background text-foreground border-border hover:bg-neutral"
              disabled={isStartingStream}
            >
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleStartStream}
            disabled={loadingTiers || isStartingStream}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {isStartingStream ? (
              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RadioIcon className="w-5 h-5 mr-2" />
            )}
            Stream starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}