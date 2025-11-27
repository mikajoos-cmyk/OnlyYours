import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Loader2Icon } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export default function ReportModal({ isOpen, onClose, postId }: ReportModalProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({ title: "Fehler", description: "Bitte wähle einen Grund aus.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user?.id,
          post_id: postId,
          reason: reason,
          description: description
        });

      if (error) throw error;

      toast({ title: "Meldung gesendet", description: "Wir werden den Inhalt prüfen." });
      onClose();
    } catch (error: any) {
      console.error("Report error:", error);
      toast({ title: "Fehler", description: "Meldung konnte nicht gesendet werden.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inhalt melden</DialogTitle>
          <DialogDescription>
            Warum möchtest du diesen Inhalt melden?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Grund</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Wähle einen Grund" />
              </SelectTrigger>
              <SelectContent className="bg-card text-foreground border-border">
                <SelectItem value="spam">Spam oder Betrug</SelectItem>
                <SelectItem value="nudity">Nacktheit oder sexuelle Handlungen (Unmarkiert)</SelectItem>
                <SelectItem value="violence">Gewalt oder gefährliche Organisationen</SelectItem>
                <SelectItem value="harassment">Mobbing oder Belästigung</SelectItem>
                <SelectItem value="copyright">Urheberrechtsverletzung</SelectItem>
                <SelectItem value="illegal">Illegale Waren oder Dienstleistungen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weitere Details..."
              className="bg-background border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="hover:bg-neutral text-foreground border-border">Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isSubmitting ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" /> : null}
            Melden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}