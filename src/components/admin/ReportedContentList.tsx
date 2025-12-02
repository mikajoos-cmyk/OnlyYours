import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2Icon, Trash2Icon, CheckCircleIcon, ExternalLinkIcon, AlertTriangleIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface Report {
    report_id: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    reporter_name: string;
    post_id: string;
    post_caption: string;
    post_media_url: string;
}

export default function ReportedContentList() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_reports');
            if (error) throw error;
            setReports(data as Report[]);
        } catch (err: any) {
            console.error("Error fetching reports:", err);
            toast({ title: "Fehler", description: "Meldungen konnten nicht geladen werden.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleDeletePost = async (postId: string, reportId: string) => {
        if (!confirm("Möchtest du diesen Beitrag wirklich unwiderruflich löschen?")) return;

        try {
            // 1. Delete post
            const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);
            if (deleteError) throw deleteError;

            // 2. Update report status (optional, but good for history if we didn't cascade delete report)
            // Since we have ON DELETE CASCADE on reports -> post_id, the report might be gone already.
            // But if we want to keep the report, we should have set ON DELETE SET NULL.
            // Assuming CASCADE for now, so we just update UI.

            toast({ title: "Gelöscht", description: "Beitrag wurde entfernt." });
            setReports(prev => prev.filter(r => r.post_id !== postId)); // Remove all reports for this post
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        }
    };

    const handleDismissReport = async (reportId: string) => {
        try {
            const { error } = await supabase
                .from('content_reports')
                .update({ status: 'DISMISSED' })
                .eq('id', reportId);

            if (error) throw error;

            toast({ title: "Ignoriert", description: "Meldung wurde als erledigt markiert." });
            setReports(prev => prev.filter(r => r.report_id !== reportId));
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2Icon className="animate-spin w-8 h-8 text-secondary" /></div>;

    return (
        <div className="space-y-4">
            {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Keine offenen Meldungen.</div>
            ) : (
                reports.map((report) => (
                    <Card key={report.report_id} className="bg-card border-border overflow-hidden">
                        <CardHeader className="pb-2 bg-neutral/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangleIcon className="w-4 h-4 text-destructive" />
                                        {report.reason}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Gemeldet von <span className="font-medium text-foreground">{report.reporter_name || 'Unbekannt'}</span> am {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleDismissReport(report.report_id)} className="text-muted-foreground hover:text-foreground">
                                        <CheckCircleIcon className="w-4 h-4 mr-1" /> Ignorieren
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeletePost(report.post_id, report.report_id)}>
                                        <Trash2Icon className="w-4 h-4 mr-1" /> Löschen
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                            <div className="aspect-square bg-neutral rounded-md overflow-hidden relative group">
                                {report.post_media_url ? (
                                    report.post_media_url.includes('.mp4') || report.post_media_url.includes('.mov') ? (
                                        <video src={report.post_media_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={report.post_media_url} alt="Reported content" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Kein Medium</div>
                                )}
                                <a href={`/post/${report.post_id}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium">
                                    <ExternalLinkIcon className="w-5 h-5 mr-2" /> Öffnen
                                </a>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Beschreibung des Melders</span>
                                    <p className="text-sm text-foreground bg-neutral/20 p-2 rounded mt-1">{report.description || 'Keine Beschreibung'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Beitragstext</span>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{report.post_caption || 'Keine Caption'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}
