// src/components/creator/MassMessageModal.tsx
import { useState, useEffect, useMemo } from 'react';
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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Loader2Icon, SendIcon, UsersIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { subscriptionService } from '../../services/subscriptionService';
import { tierService, Tier } from '../../services/tierService';
import { messageService } from '../../services/messageService';
import { cn } from '../../lib/utils';

// Ein einfacherer Typ für die Liste
interface FanInfo {
  id: string;
  name: string;
  avatar: string | null;
  tierId: string | null;
}

interface MassMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MassMessageModal({ isOpen, onClose }: MassMessageModalProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [message, setMessage] = useState('');
  const [allSubscribers, setAllSubscribers] = useState<FanInfo[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState('all'); // 'all', 'base', oder tier.id
  const [selectedFanIds, setSelectedFanIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Daten (Abonnenten & Tiers) laden, wenn das Modal geöffnet wird
  useEffect(() => {
    if (isOpen && user?.id) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          // Lade Tiers für den Filter
          const creatorTiers = await tierService.getCreatorTiers(user.id);
          setTiers(creatorTiers || []);

          // Lade alle Abonnenten
          const subscriberData = await subscriptionService.getCreatorSubscribers(user.id);

          // Mappe zu einfacherem Format
          const fanInfos: FanInfo[] = subscriberData
            .filter(sub => sub.fan) // Nur Abos mit gültigen Fan-Daten
            .map(sub => ({
              id: sub.fan.id,
              name: sub.fan.display_name,
              avatar: sub.fan.avatar_url,
              tierId: sub.tier_id,
            }));

          setAllSubscribers(fanInfos);

        } catch (error: any) {
          toast({ title: "Fehler", description: "Abonnenten-Daten konnten nicht geladen werden: " + error.message, variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      // Reset bei Schließen
      setMessage('');
      setSelectedFanIds([]);
      setSelectedTierId('all');
    }
  }, [isOpen, user?.id, toast]);

  // Gefilterte Liste basierend auf der Tier-Auswahl
  const filteredSubscribers = useMemo(() => {
    if (selectedTierId === 'all') {
      return allSubscribers;
    }
    if (selectedTierId === 'base') {
      // 'base' sind Abonnenten OHNE tier_id
      return allSubscribers.filter(sub => sub.tierId === null);
    }
    // Nach spezifischer Tier-ID filtern
    return allSubscribers.filter(sub => sub.tierId === selectedTierId);
  }, [allSubscribers, selectedTierId]);

  // Handler für "Alle auswählen"
  const handleSelectAll = () => {
    if (selectedFanIds.length === filteredSubscribers.length) {
      // Alle sind ausgewählt -> Alle abwählen
      setSelectedFanIds([]);
    } else {
      // Alle (gefilterten) auswählen
      setSelectedFanIds(filteredSubscribers.map(sub => sub.id));
    }
  };
  const isAllSelected = filteredSubscribers.length > 0 && selectedFanIds.length === filteredSubscribers.length;
  const isSomeSelected = selectedFanIds.length > 0 && !isAllSelected;

  // Handler für einzelnen Fan
  const handleToggleFan = (fanId: string) => {
    setSelectedFanIds(prev =>
      prev.includes(fanId)
        ? prev.filter(id => id !== fanId)
        : [...prev, fanId]
    );
  };

  // Handler für Nachrichtenversand
  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: "Leere Nachricht", description: "Bitte geben Sie eine Nachricht ein.", variant: "destructive" });
      return;
    }
    if (selectedFanIds.length === 0) {
      toast({ title: "Keine Empfänger", description: "Bitte wählen Sie mindestens einen Abonnenten aus.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Sende alle Nachrichten parallel
      const sendPromises = selectedFanIds.map(fanId =>
        messageService.sendMessage(fanId, message)
      );

      await Promise.all(sendPromises);

      toast({
        title: "Nachricht gesendet!",
        description: `Ihre Nachricht wurde an ${selectedFanIds.length} Abonnent(en) gesendet.`,
      });
      onClose();

    } catch (error: any) {
      toast({ title: "Fehler beim Senden", description: "Einige Nachrichten konnten nicht gesendet werden: " + error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">Massen-Nachricht senden</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Senden Sie eine Nachricht an ausgewählte Abonnenten.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">

          {/* 1. Nachricht-Textarea */}
          <div className="space-y-2">
            <Label htmlFor="mass-message" className="text-foreground">Nachricht</Label>
            <Textarea
              id="mass-message"
              placeholder="Verfassen Sie Ihre Nachricht..."
              className="min-h-32 bg-background text-foreground border-border"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
          </div>

          <Separator className="bg-border" />

          {/* 2. Empfänger-Auswahl */}
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            <Label className="text-foreground">Empfänger</Label>

            {/* Filter-Leiste */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="tier-filter" className="text-xs text-muted-foreground">
                  Nach Stufe filtern
                </Label>
                <Select
                  value={selectedTierId}
                  onValueChange={setSelectedTierId}
                  disabled={isLoading || isSending}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border-border">
                    <SelectItem value="all">Alle Abonnenten ({allSubscribers.length})</SelectItem>
                    {tiers.map(tier => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name} ({allSubscribers.filter(s => s.tierId === tier.id).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* "Alle auswählen"-Checkbox */}
            <div className="flex items-center space-x-2 py-2 border-y border-border">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                data-state={isSomeSelected ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked')}
                disabled={isLoading || isSending || filteredSubscribers.length === 0}
                className={cn(
                    "border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground",
                    "data-[state=indeterminate]:bg-secondary data-[state=indeterminate]:text-secondary-foreground"
                )}
              />
              <Label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer">
                {filteredSubscribers.length} Abonnent(en) in dieser Gruppe
              </Label>
            </div>

            {/* Abonnenten-Liste */}
            <ScrollArea className="flex-1 h-full">
              <div className="space-y-3 pr-4">
                {isLoading && <p className="text-muted-foreground text-center">Lade Abonnenten...</p>}
                {!isLoading && filteredSubscribers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    {selectedTierId === 'all' ? 'Sie haben noch keine Abonnenten.' : 'Keine Abonnenten in dieser Stufe.'}
                  </p>
                )}
                {!isLoading && filteredSubscribers.map(fan => (
                  // --- KORREKTUR HIER ---
                  // 1. <Label> statt <div> für die ganze Zeile.
                  // 2. `htmlFor` verknüpft das Label mit der Checkbox.
                  // 3. `onCheckedChange` (statt onClick) wird auf der Checkbox verwendet.
                  <Label
                    key={fan.id}
                    htmlFor={`fan-${fan.id}`} // Verknüpfung mit Checkbox ID
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer",
                      selectedFanIds.includes(fan.id) ? 'bg-secondary/10' : 'hover:bg-neutral'
                    )}
                  >
                    <Checkbox
                      id={`fan-${fan.id}`} // Eindeutige ID
                      checked={selectedFanIds.includes(fan.id)}
                      onCheckedChange={() => handleToggleFan(fan.id)} // Löst Toggle aus
                      disabled={isSending}
                      className="border-secondary data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground"
                    />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={fan.avatar || undefined} alt={fan.name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {fan.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">{fan.name}</span>
                  </Label>
                  // --- ENDE KORREKTUR ---
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="bg-background text-foreground border-border hover:bg-neutral"
              disabled={isSending}
            >
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            disabled={isSending || isLoading || selectedFanIds.length === 0 || !message.trim()}
            onClick={handleSend}
          >
            {isSending ? (
              <Loader2Icon className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <SendIcon className="w-5 h-5 mr-2" />
                Senden an {selectedFanIds.length} Empfänger
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}