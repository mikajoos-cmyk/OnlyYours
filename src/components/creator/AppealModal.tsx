import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { Loader2Icon } from 'lucide-react';

interface AppealModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    creatorId: string;
    onSuccess?: () => void;
}

export default function AppealModal({ isOpen, onClose, postId, creatorId, onSuccess }: AppealModalProps) {
    const { toast } = useToast();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast({ title: "Fehler", description: "Bitte gib eine Begründung für deinen Widerspruch an.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('moderation_appeals')
                .insert({
                    post_id: postId,
                    creator_id: creatorId,
                    appeal_reason: reason,
                    status: 'PENDING'
                });

            if (error) throw error;

            toast({ title: "Widerspruch eingereicht", description: "Wir werden deinen Fall erneut prüfen." });
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error("Appeal error:", error);
            toast({ title: "Fehler", description: "Widerspruch konnte nicht gesendet werden.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Widerspruch einlegen</DialogTitle>
                    <DialogDescription>
                        Warum sollte dein Beitrag wieder freigeschaltet werden? Bitte erkläre uns, warum kein Richtlinienverstoß vorliegt.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="appeal-reason">Deine Begründung</Label>
                        <Textarea
                            id="appeal-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ich bin der Meinung, dass..."
                            className="bg-background border-border min-h-[120px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="hover:bg-neutral text-foreground border-border">Abbrechen</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-primary-foreground">
                        {isSubmitting ? <Loader2Icon className="animate-spin h-4 w-4 mr-2" /> : null}
                        Widerspruch senden
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
