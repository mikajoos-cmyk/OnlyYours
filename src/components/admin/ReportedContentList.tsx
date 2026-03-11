// src/components/admin/ReportedContentList.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2Icon, Trash2Icon, CheckCircleIcon, ExternalLinkIcon, AlertTriangleIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { adminService } from '../../services/adminService';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

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

    // Reports laden (via RPC, da adminService.getReports() im Interface nicht explizit definiert war)
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
            await adminService.deletePost(postId);

            toast({ title: "Gelöscht", description: "Beitrag wurde entfernt." });

            // Lokales Update: Entferne alle Reports, die sich auf diesen Post beziehen
            setReports(prev => prev.filter(r => r.post_id !== postId));
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        }
    };

    const handleDismissReport = async (reportId: string) => {
        try {
            await adminService.dismissReport(reportId);

            toast({ title: "Ignoriert", description: "Meldung wurde als erledigt markiert." });

            // Lokales Update
            setReports(prev => prev.filter(r => r.report_id !== reportId));
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        }
    };

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [resolutionReason, setResolutionReason] = useState('');
    const [actionType, setActionType] = useState<'TAKEDOWN' | 'DISMISS' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const openActionDialog = (report: Report, type: 'TAKEDOWN' | 'DISMISS') => {
        setSelectedReport(report);
        setActionType(type);
        setResolutionReason('');
    };

    const handleActionSubmit = async () => {
        if (!selectedReport || !actionType || !resolutionReason.trim()) {
            toast({ title: "Fehler", description: "Bitte gib eine Begründung an.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            if (actionType === 'TAKEDOWN') {
                await adminService.takeDownPost(selectedReport.post_id, selectedReport.report_id, resolutionReason);
                toast({ title: "Inhalt gesperrt", description: "Der Beitrag wurde entfernt und der Creator informiert." });
                setReports(prev => prev.filter(r => r.post_id !== selectedReport.post_id));
            } else {
                await adminService.dismissReport(selectedReport.report_id, resolutionReason);
                toast({ title: "Meldung abgelehnt", description: "Der Melder wurde über die Ablehnung informiert." });
                setReports(prev => prev.filter(r => r.report_id !== selectedReport.report_id));
            }
            setSelectedReport(null);
            setActionType(null);
        } catch (err: any) {
            toast({ title: "Fehler", description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
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
                                    <Button size="sm" variant="outline" onClick={() => openActionDialog(report, 'DISMISS')} className="text-muted-foreground hover:text-foreground">
                                        <CheckCircleIcon className="w-4 h-4 mr-1" /> Ignorieren
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => openActionDialog(report, 'TAKEDOWN')}>
                                        <Trash2Icon className="w-4 h-4 mr-1" /> Sperren
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                            {/* Medien-Vorschau */}
                            <div className="aspect-square bg-neutral rounded-md overflow-hidden relative group">
                                {report.post_media_url ? (
                                    report.post_media_url.includes('.mp4') || report.post_media_url.includes('.mov') ? (
                                        <video src={report.post_media_url} className="w-full h-full object-cover" controls />
                                    ) : (
                                        <img src={report.post_media_url} alt="Reported content" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Kein Medium</div>
                                )}

                                {/* Link zum Post (nur wenn noch existent) */}
                                <a href={`/post/${report.post_id}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium">
                                    <ExternalLinkIcon className="w-5 h-5 mr-2" /> Öffnen
                                </a>
                            </div>

                            {/* Details */}
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Beschreibung des Melders</span>
                                    <p className="text-sm text-foreground bg-neutral/20 p-3 rounded">{report.description || 'Keine Beschreibung angegeben.'}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Beitragstext</span>
                                    <p className="text-sm text-muted-foreground line-clamp-3 italic">"{report.post_caption || 'Keine Caption'}"</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            {/* Moderations-Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={() => !isProcessing && setSelectedReport(null)}>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{actionType === 'TAKEDOWN' ? 'Inhalt sperren' : 'Meldung ignorieren'}</DialogTitle>
                        <DialogDescription>
                            Bitte gib eine Begründung für diese Entscheidung an. Diese wird dem Melder {actionType === 'TAKEDOWN' ? 'und dem Creator' : ''} mitgeteilt (DSA-Pflicht).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Begründung (Pflichtfeld)</Label>
                            <Textarea
                                id="reason"
                                value={resolutionReason}
                                onChange={(e) => setResolutionReason(e.target.value)}
                                placeholder="z.B. Verstoß gegen Richtlinien bezüglich..."
                                className="bg-background border-border min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReport(null)} disabled={isProcessing} className="hover:bg-neutral text-foreground border-border">Abbrechen</Button>
                        <Button
                            onClick={handleActionSubmit}
                            disabled={isProcessing || !resolutionReason.trim()}
                            variant={actionType === 'TAKEDOWN' ? 'destructive' : 'default'}
                        >
                            {isProcessing && <Loader2Icon className="animate-spin h-4 w-4 mr-2" />}
                            Entscheidung bestätigen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}