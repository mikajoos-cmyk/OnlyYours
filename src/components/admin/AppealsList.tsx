import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2Icon, CheckCircleIcon, XCircleIcon, AlertCircleIcon, ExternalLinkIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface Appeal {
    id: string;
    post_id: string;
    creator_id: string;
    appeal_reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
    creator_name: string;
    post_caption: string;
}

export default function AppealsList() {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchAppeals = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('moderation_appeals')
                .select(`
                    *,
                    creator:profiles!creator_id(display_name),
                    post:posts!post_id(caption)
                `)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedAppeals = data.map((a: any) => ({
                ...a,
                creator_name: a.creator?.display_name || 'Unbekannt',
                post_caption: a.post?.caption || 'Keine Caption'
            }));

            setAppeals(formattedAppeals);
        } catch (err: any) {
            console.error("Error fetching appeals:", err);
            toast({ title: "Fehler", description: "Widersprüche konnten nicht geladen werden.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppeals();
    }, []);

    const handleResolveAppeal = async (appeal: Appeal, newStatus: 'APPROVED' | 'REJECTED') => {
        try {
            // 1. Appeal Status aktualisieren
            const { error: appealError } = await supabase
                .from('moderation_appeals')
                .update({ status: newStatus })
                .eq('id', appeal.id);
            if (appealError) throw appealError;

            // 2. Falls APPROVED: Post wieder auf ACTIVE setzen
            if (newStatus === 'APPROVED') {
                const { error: postError } = await supabase
                    .from('posts')
                    .update({ moderation_status: 'ACTIVE' })
                    .eq('id', appeal.post_id);
                if (postError) throw postError;
                toast({ title: "Widerspruch stattgegeben", description: "Der Beitrag wurde wieder freigeschaltet." });
            } else {
                toast({ title: "Widerspruch abgelehnt", description: "Die Sperre bleibt bestehen." });
            }

            setAppeals(prev => prev.filter(a => a.id !== appeal.id));
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2Icon className="animate-spin w-8 h-8 text-secondary" /></div>;

    return (
        <div className="space-y-4">
            {appeals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Keine offenen Widersprüche.</div>
            ) : (
                appeals.map((appeal) => (
                    <Card key={appeal.id} className="bg-card border-border overflow-hidden">
                        <CardHeader className="pb-2 bg-neutral/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertCircleIcon className="w-4 h-4 text-primary" />
                                        Widerspruch von {appeal.creator_name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Eingegangen am {new Date(appeal.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleResolveAppeal(appeal, 'REJECTED')} className="text-destructive hover:bg-destructive/10">
                                        <XCircleIcon className="w-4 h-4 mr-1" /> Ablehnen
                                    </Button>
                                    <Button size="sm" variant="default" onClick={() => handleResolveAppeal(appeal, 'APPROVED')} className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircleIcon className="w-4 h-4 mr-1" /> Freischalten
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div>
                                <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Begründung des Creators</span>
                                <p className="text-sm text-foreground bg-neutral/20 p-3 rounded">{appeal.appeal_reason}</p>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-neutral/10 rounded-md">
                                <div className="text-sm truncate mr-4">
                                    <span className="text-muted-foreground">Betroffener Beitrag:</span> {appeal.post_caption}
                                </div>
                                <a href={`/post/${appeal.post_id}`} target="_blank" rel="noreferrer" className="text-xs flex items-center text-primary hover:underline flex-shrink-0">
                                    <ExternalLinkIcon className="w-3 h-3 mr-1" /> Vorschau
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
