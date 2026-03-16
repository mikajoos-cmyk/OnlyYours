import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AppealModalProps {
  userId: string;
  isOpen?: boolean;
  onClose?: () => void;
  postId?: string;
  onSuccess?: () => void;
  appealStatus?: 'pending' | 'accepted' | 'rejected' | null;
}

export function AppealModal({ userId, isOpen: propIsOpen, onClose, postId, onSuccess, appealStatus }: AppealModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onClose && !val) onClose();
    setInternalIsOpen(val);
  };
  
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const getButtonText = () => {
    if (appealStatus === 'pending') return 'Widerspruch eingelegt';
    if (appealStatus === 'rejected') return 'Abgelehnt';
    return 'Widerspruch einlegen';
  };

  const isButtonDisabled = !!appealStatus;

  const handleSubmit = async () => {
    if (isButtonDisabled) return;
    setIsSubmitting(true);
    try {
      if (postId) {
        // Widerspruch für einen spezifischen Post
        const { data: existingReport, error: fetchError } = await supabase
          .from('user_reports')
          .select('id')
          .eq('related_post_id', postId)
          .eq('status', 'resolved')
          .is('appeal_status', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingReport) {
          // Fallback: Wenn kein Report da ist, erstellen wir einen "Selbst-Report" als Platzhalter für den Widerspruch
          // Dies kann passieren, wenn ein Admin manuell gesperrt hat ohne Report-Eintrag
          const { error: insertError } = await supabase
            .from('user_reports')
            .insert({
              reporter_id: userId, // In diesem Fall ist der User selbst der "Reporter" seines Widerspruchs
              reported_id: userId,
              reason: 'appeal_fallback',
              description: 'Manueller Widerspruch gegen Inhalts-Sperrung',
              related_post_id: postId,
              status: 'resolved',
              appeal_status: 'pending',
              appeal_description: description,
              appealed_at: new Date().toISOString()
            });
          if (insertError) throw insertError;
        } else {
          const { error } = await supabase
            .from('user_reports')
            .update({
              appeal_status: 'pending',
              appeal_description: description,
              appealed_at: new Date().toISOString()
            })
            .eq('id', existingReport.id);
          
          if (error) throw error;
        }
      } else {
        // Widerspruch für Account-Sperrung
        const { data: existingReport, error: fetchError } = await supabase
          .from('user_reports')
          .select('id')
          .eq('reported_id', userId)
          .is('related_post_id', null)
          .is('related_message_id', null)
          .is('related_comment_id', null)
          .eq('status', 'resolved')
          .is('appeal_status', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingReport) {
          // Fallback: Wenn kein Report da ist
          const { error: insertError } = await supabase
            .from('user_reports')
            .insert({
              reporter_id: userId,
              reported_id: userId,
              reason: 'appeal_fallback',
              description: 'Manueller Widerspruch gegen Account-Sperrung',
              status: 'resolved',
              appeal_status: 'pending',
              appeal_description: description,
              appealed_at: new Date().toISOString()
            });
          if (insertError) throw insertError;
        } else {
          const { error } = await supabase
            .from('user_reports')
            .update({
              appeal_status: 'pending',
              appeal_description: description,
              appealed_at: new Date().toISOString()
            })
            .eq('id', existingReport.id);

          if (error) throw error;
        }
        await supabase.from('users').update({ has_pending_appeal: true }).eq('id', userId);
      }

      toast({ title: 'Widerspruch eingereicht' });
      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast({ title: 'Fehler', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{postId ? 'Widerspruch gegen Inhalts-Sperrung' : 'Widerspruch zur Account-Sperrung'}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <p className="text-sm text-gray-500 mb-4">
          Bitte erkläre ausführlich, warum die Entscheidung aus deiner Sicht ungerechtfertigt ist. 
          Unser Team wird den Fall daraufhin erneut prüfen.
        </p>
        <Textarea
          placeholder="Deine Begründung..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
      </div>
      <Button onClick={handleSubmit} disabled={!description || isSubmitting} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Absenden
      </Button>
    </DialogContent>
  );

  if (propIsOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={(val) => !val && onClose?.()}>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="w-full" disabled={isButtonDisabled}>
          {getButtonText()}
        </Button>
      </DialogTrigger>
      {!isButtonDisabled && content}
    </Dialog>
  );
}
