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
}

export function AppealModal({ userId, isOpen: propIsOpen, onClose, postId, onSuccess }: AppealModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onClose && !val) onClose();
    setInternalIsOpen(val);
  };
  
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (postId) {
        // Widerspruch für einen spezifischen Post
        const { error } = await supabase
          .from('user_reports')
          .update({
            appeal_status: 'pending',
            appeal_description: description,
            appealed_at: new Date().toISOString()
          })
          .eq('related_post_id', postId)
          .eq('status', 'resolved')
          .is('appeal_status', null);
        
        if (error) throw error;
      } else {
        // Widerspruch für Account-Sperrung
        const { error } = await supabase
          .from('user_reports')
          .update({
            appeal_status: 'pending',
            appeal_description: description,
            appealed_at: new Date().toISOString()
          })
          .eq('reported_id', userId)
          .eq('status', 'resolved')
          .is('appeal_status', null);

        if (error) throw error;
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
        <Button variant="default" className="w-full">Widerspruch einlegen</Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}
