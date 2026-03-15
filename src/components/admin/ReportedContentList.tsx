// src/components/admin/ReportedContentList.tsx
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2Icon, Trash2Icon, CheckCircleIcon, ExternalLinkIcon, AlertTriangleIcon, FilterIcon, UserXIcon, MessageSquareIcon, XIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { adminService } from '../../services/adminService';
import { storageService } from '../../services/storageService';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface Report {
    report_id: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    reporter_name: string;
    reported_user_id: string;
    reported_user_name: string;
    reported_username: string;
    post_id: string | null;
    post_caption: string | null;
    post_media_url: string | null;
    post_media_type: string | null;
    message_id: string | null;
    comment_id: string | null;
    appeal_status: string | null;
    appeal_description: string | null;
    appealed_at: string | null;
    conversation_id: string | null;
}

export default function ReportedContentList() {
    const [reports, setReports] = useState<Report[]>([]);
    const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('pending');
    const { toast } = useToast();

    // Gefilterte Berichte
    const filteredReports = useMemo(() => {
        if (filterStatus === 'ALL') return reports;
        if (filterStatus === 'appeals') return reports.filter(r => r.appeal_status === 'pending');
        return reports.filter(r => r.status === filterStatus);
    }, [reports, filterStatus]);

    // Reports laden
    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_reports');
            if (error) throw error;
            const reportData = data as Report[];
            setReports(reportData);

            // Medien-URLs auflösen
            const urlMap: Record<string, string> = {};
            await Promise.all(reportData.map(async (report) => {
                if (report.post_media_url) {
                    const resolved = await storageService.resolveImageUrl(report.post_media_url);
                    urlMap[report.report_id] = resolved;
                }
            }));
            setResolvedMediaUrls(urlMap);
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

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [previewReport, setPreviewReport] = useState<Report | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [resolutionReason, setResolutionReason] = useState('');
    const [actionType, setActionType] = useState<'TAKEDOWN' | 'DISMISS' | 'SUSPEND' | 'ACCEPT_APPEAL' | 'REJECT_APPEAL' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePreviewClick = async (report: Report) => {
        if (!report.message_id || !report.conversation_id) return;

        setPreviewReport(report);
        setIsPreviewLoading(true);
        setPreviewData(null);
        try {
            const context = await adminService.getReportedMessageContext(report.message_id, report.conversation_id);
            setPreviewData(context);
        } catch (err) {
            console.error("Error loading preview:", err);
            toast({ title: "Fehler", description: "Vorschau konnte nicht geladen werden.", variant: "destructive" });
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const getStatusBadge = (status: string, appealStatus?: string | null) => {
        if (appealStatus === 'pending') {
            return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Widerspruch offen</Badge>;
        }

        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Ausstehend</Badge>;
            case 'resolved':
                return <Badge variant="destructive">Erledigt / Sanktion</Badge>;
            case 'dismissed':
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Abgelehnt</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const openActionDialog = (report: Report, type: 'TAKEDOWN' | 'DISMISS' | 'SUSPEND' | 'ACCEPT_APPEAL' | 'REJECT_APPEAL') => {
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
            if (actionType === 'TAKEDOWN' && selectedReport.post_id) {
                await adminService.takeDownPost(selectedReport.post_id, selectedReport.report_id, resolutionReason);
                toast({ title: "Inhalt gesperrt", description: "Der Beitrag wurde entfernt." });
            } else if (actionType === 'SUSPEND') {
                await adminService.suspendUser(selectedReport.reported_user_id, selectedReport.report_id, resolutionReason);
                toast({ title: "Nutzer gesperrt", description: "Der Account wurde vorübergehend gesperrt." });
            } else if (actionType === 'DISMISS') {
                await adminService.dismissReport(selectedReport.report_id, resolutionReason);
                toast({ title: "Meldung abgelehnt", description: "Die Meldung wurde als unbegründet markiert." });
            } else if (actionType === 'ACCEPT_APPEAL') {
                await adminService.handleAppeal(selectedReport.report_id, 'accepted', resolutionReason);
                toast({ title: "Widerspruch stattgegeben", description: "Die Sanktion wurde aufgehoben." });
            } else if (actionType === 'REJECT_APPEAL') {
                await adminService.handleAppeal(selectedReport.report_id, 'rejected', resolutionReason);
                toast({ title: "Widerspruch abgelehnt", description: "Die Sanktion bleibt bestehen." });
            }

            // Lokales Update
            setReports(prev => prev.map(r => 
                r.report_id === selectedReport.report_id 
                ? { 
                    ...r, 
                    status: (actionType === 'DISMISS') ? 'dismissed' : 
                            (actionType === 'ACCEPT_APPEAL' || actionType === 'REJECT_APPEAL') ? r.status : 'resolved',
                    appeal_status: actionType === 'ACCEPT_APPEAL' ? 'accepted' : 
                                   actionType === 'REJECT_APPEAL' ? 'rejected' : r.appeal_status
                  } 
                : r
            ));

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
            <div className="flex items-center justify-between mb-6">
                <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
                    <div className="flex items-center justify-between bg-neutral/10 p-1 rounded-lg">
                        <TabsList className="bg-transparent border-none">
                            <TabsTrigger value="pending" className="data-[state=active]:bg-background">Offen</TabsTrigger>
                            <TabsTrigger value="appeals" className="data-[state=active]:bg-background">Widersprüche</TabsTrigger>
                            <TabsTrigger value="resolved" className="data-[state=active]:bg-background">Sanktioniert</TabsTrigger>
                            <TabsTrigger value="dismissed" className="data-[state=active]:bg-background">Abgelehnt</TabsTrigger>
                            <TabsTrigger value="ALL" className="data-[state=active]:bg-background">Alle</TabsTrigger>
                        </TabsList>
                        <div className="px-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <FilterIcon className="w-3 h-3" />
                            {filteredReports.length} Meldungen
                        </div>
                    </div>
                </Tabs>
            </div>

            {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-neutral/5 rounded-lg border border-dashed border-border">
                    Keine Meldungen in dieser Kategorie gefunden.
                </div>
            ) : (
                filteredReports.map((report) => (
                    <Card key={report.report_id} className="bg-card border-border overflow-hidden">
                        <CardHeader className="pb-2 bg-neutral/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <AlertTriangleIcon className="w-4 h-4 text-destructive" />
                                            {report.reason}
                                        </CardTitle>
                                        {getStatusBadge(report.status, report.appeal_status)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Gemeldet von <span className="font-medium text-foreground">{report.reporter_name || 'Unbekannt'}</span> gegen <span className="font-medium text-foreground">{report.reported_user_name || 'Unbekannt'}</span> am {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {report.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openActionDialog(report, 'DISMISS')} className="text-muted-foreground hover:text-foreground">
                                            <CheckCircleIcon className="w-4 h-4 mr-1" /> Ignorieren
                                        </Button>
                                        {report.post_id && (
                                            <Button size="sm" variant="outline" onClick={() => openActionDialog(report, 'TAKEDOWN')} className="text-orange-500 border-orange-500/20 hover:bg-orange-500/10">
                                                <Trash2Icon className="w-4 h-4 mr-1" /> Post sperren
                                            </Button>
                                        )}
                                        <Button size="sm" variant="destructive" onClick={() => openActionDialog(report, 'SUSPEND')}>
                                            <UserXIcon className="w-4 h-4 mr-1" /> Account sperren
                                        </Button>
                                    </div>
                                )}
                                {report.appeal_status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openActionDialog(report, 'ACCEPT_APPEAL')} className="text-green-500 border-green-500/20 hover:bg-green-500/10">
                                            <CheckCircleIcon className="w-4 h-4 mr-1" /> Widerspruch stattgeben
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => openActionDialog(report, 'REJECT_APPEAL')}>
                                            <XIcon className="w-4 h-4 mr-1" /> Widerspruch ablehnen
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                            {/* Medien-Vorschau oder Icon */}
                            <div className="aspect-square bg-neutral rounded-md overflow-hidden relative group">
                                {report.post_media_url ? (
                                    report.post_media_type?.toUpperCase() === 'VIDEO' || report.post_media_url.includes('.mp4') || report.post_media_url.includes('.mov') ? (
                                        <video src={resolvedMediaUrls[report.report_id] || report.post_media_url} className="w-full h-full object-cover" controls />
                                    ) : (
                                        <img src={resolvedMediaUrls[report.report_id] || report.post_media_url} alt="Reported content" className="w-full h-full object-cover" />
                                    )
                                ) : report.message_id ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center">
                                        <MessageSquareIcon className="w-8 h-8 mb-2 opacity-20" />
                                        Chat-Nachricht
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                                        Profil / Nutzer
                                    </div>
                                )}

                                {report.post_id && (
                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                        <a 
                                            href={`/post/${report.post_id}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center hover:bg-secondary/90 transition-colors"
                                        >
                                            <ExternalLinkIcon className="w-4 h-4 mr-2" /> In neuem Tab öffnen
                                        </a>
                                    </div>
                                )}
                                {!report.post_id && report.message_id && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="secondary" onClick={() => handlePreviewClick(report)}>
                                            <ExternalLinkIcon className="w-4 h-4 mr-2" /> Chat-Vorschau
                                        </Button>
                                    </div>
                                )}
                                {!report.post_id && !report.message_id && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a 
                                            href={`/profile/${report.reported_username}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center hover:bg-secondary/90 transition-colors"
                                        >
                                            <ExternalLinkIcon className="w-4 h-4 mr-2" /> Zum Profil
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="space-y-4">
                                <div>
                                    <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Beschreibung des Melders</span>
                                    <p className="text-sm text-foreground bg-neutral/20 p-3 rounded">{report.description || 'Keine Beschreibung angegeben.'}</p>
                                </div>
                                
                                {report.post_caption && (
                                    <div>
                                        <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">Beitragstext</span>
                                        <p className="text-sm text-muted-foreground line-clamp-3 italic">"{report.post_caption}"</p>
                                    </div>
                                )}

                                {report.appeal_status === 'pending' && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded">
                                        <span className="text-xs font-bold uppercase text-orange-500 block mb-1">Widerspruch des Nutzers</span>
                                        <p className="text-sm text-foreground">{report.appeal_description}</p>
                                        <p className="text-[10px] text-muted-foreground mt-2">Eingereicht am {new Date(report.appealed_at!).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            {/* Vorschau-Dialog */}
            <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
                <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Inhalts-Vorschau</DialogTitle>
                        <DialogDescription>
                            Genaue Prüfung des gemeldeten Inhalts.
                        </DialogDescription>
                    </DialogHeader>

                    {isPreviewLoading ? (
                        <div className="flex justify-center py-12"><Loader2Icon className="animate-spin w-8 h-8 text-secondary" /></div>
                    ) : (
                        <div className="space-y-6 py-4">
                            {/* CHAT VORSCHAU */}
                            {previewReport?.message_id && Array.isArray(previewData) && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline">Chat-Kontext (11 Nachrichten)</Badge>
                                        <span className="text-[10px] text-muted-foreground italic">
                                            5 davor / 5 danach (DSGVO-konform)
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-1 bg-neutral/5 p-4 rounded-xl border border-border">
                                        {previewData.map((msg: any) => {
                                            const isReportedUser = msg.sender_id === previewReport.reported_user_id;
                                            const isTargetMessage = msg.id === previewReport.message_id;

                                            return (
                                                <div key={msg.id} className={cn(
                                                    "flex w-full",
                                                    isReportedUser ? "justify-start" : "justify-end"
                                                )}>
                                                    <div className={cn(
                                                        "max-w-[85%] p-3 rounded-2xl mb-2",
                                                        isReportedUser 
                                                            ? "bg-neutral/20 text-foreground rounded-tl-none border border-border/50" 
                                                            : "bg-secondary/10 text-foreground rounded-tr-none border border-secondary/20",
                                                        isTargetMessage && "ring-2 ring-destructive border-destructive/50 bg-destructive/5 shadow-lg"
                                                    )}>
                                                        <div className="flex justify-between items-center gap-4 mb-1">
                                                            <span className={cn(
                                                                "font-bold text-[10px] uppercase tracking-wider",
                                                                isReportedUser ? "text-destructive" : "text-secondary"
                                                            )}>
                                                                {msg.sender?.display_name || 'System'}
                                                            </span>
                                                            <span className="text-[9px] opacity-50">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                        {isTargetMessage && (
                                                            <div className="flex items-center gap-1 mt-2">
                                                                <AlertTriangleIcon className="w-3 h-3 text-destructive" />
                                                                <span className="text-[9px] text-destructive font-bold uppercase">Gemeldete Nachricht</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setPreviewReport(null)}>Schließen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Moderations-Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={() => !isProcessing && setSelectedReport(null)}>
                <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'TAKEDOWN' ? 'Inhalt sperren' : 
                             actionType === 'SUSPEND' ? 'Account sperren' : 
                             actionType === 'ACCEPT_APPEAL' ? 'Widerspruch stattgeben' :
                             actionType === 'REJECT_APPEAL' ? 'Widerspruch ablehnen' :
                             'Meldung ignorieren'}
                        </DialogTitle>
                        <DialogDescription>
                            Bitte gib eine Begründung für diese Entscheidung an. Diese wird gemäß DSA dokumentiert.
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
                            variant={(actionType === 'DISMISS' || actionType === 'ACCEPT_APPEAL') ? 'default' : 'destructive'}
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