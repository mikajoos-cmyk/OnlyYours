import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  context?: {
    messageId?: string;
    postId?: string;
    commentId?: string;
  };
}

export default function ReportModal({ isOpen, onClose, reportedId, context }: ReportModalProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. In Datenbank schreiben
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_id: reportedId,
        reason,
        description,
        related_message_id: context?.messageId,
        related_post_id: context?.postId,
        related_comment_id: context?.commentId,
      });

      if (error) throw error;

      // 2. Eingangsbestätigung per E-Mail triggern
      await supabase.functions.invoke('send-moderation-email', {
        body: {
          type: 'report_received',
          email: user.email,
          data: { reason }
        }
      });

      toast({
        title: 'Meldung eingegangen',
        description: 'Wir haben deine Meldung erhalten und werden sie prüfen.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Meldung konnte nicht gesendet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inhalt / Nutzer melden</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Grund auswählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="copyright">Urheberrechtsverletzung / Geklauter Content</SelectItem>
              <SelectItem value="spam">Spam / Scam / Phishing</SelectItem>
              <SelectItem value="harassment">Belästigung / Beleidigung</SelectItem>
              <SelectItem value="underage">Minderjähriger Nutzer / Inhalt</SelectItem>
              <SelectItem value="other">Sonstiges</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Zusätzliche Details (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={!reason || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Melden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}