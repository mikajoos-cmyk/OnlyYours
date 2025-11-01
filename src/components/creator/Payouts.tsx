// src/components/creator/Payouts.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DollarSignIcon, TrendingUpIcon, CalendarIcon, Loader2Icon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
// --- NEUE IMPORTS ---
import { payoutService, PayoutSummary, PayoutTransaction } from '../../services/payoutService';
import { useToast } from '../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Input } from '../ui/input';
// --- ENDE NEUE IMPORTS ---

export default function Payouts() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Getrennte States für die Daten
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [history, setHistory] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Helper zum Formatieren von Währungen
  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Funktion zum Abrufen aller Daten
  const fetchPayouts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Daten parallel abrufen
      const [summaryData, historyData] = await Promise.all([
        payoutService.getPayoutSummary(user.id),
        payoutService.getPayoutHistory(user.id, 10)
      ]);
      
      setSummary(summaryData);
      setHistory(historyData);

    } catch (err: any) {
      setError('Fehler beim Laden der Auszahlungsdaten. Stellen Sie sicher, dass die Supabase RPC-Funktionen (get_payout_summary, request_payout) existieren.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [user?.id]);

  // Handler für den Auszahlungs-Button
  const handlePayoutRequest = async () => {
    if (!user?.id || !summary) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Ungültiger Betrag", description: "Bitte geben Sie einen positiven Betrag ein.", variant: "destructive" });
      return;
    }
    if (amount > summary.availableBalance) {
      toast({ title: "Fehler", description: "Der Betrag übersteigt Ihr verfügbares Guthaben.", variant: "destructive" });
      return;
    }

    setIsRequestingPayout(true);
    try {
      // RPC-Funktion aufrufen
      await payoutService.requestPayout(user.id, amount);
      
      toast({
        title: "Auszahlung beantragt",
        description: `${formatCurrency(amount)} werden nun bearbeitet.`,
      });
      
      // Daten neu laden, um das aktualisierte Guthaben anzuzeigen
      await fetchPayouts(); 
      setPayoutAmount('');
      
    } catch (err: any) {
      console.error("Fehler bei Auszahlungsanfrage:", err);
      toast({ title: "Fehler", description: err.message || "Auszahlung fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  // Helper zum Anzeigen des Status
  const getStatusBadge = (status: PayoutTransaction['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="text-sm text-success">Abgeschlossen</span>;
      case 'PENDING':
        return <span className="text-sm text-warning">Ausstehend</span>;
      case 'PROCESSING':
        return <span className="text-sm text-blue-400">In Bearbeitung</span>;
      case 'FAILED':
        return <span className="text-sm text-destructive">Fehlgeschlagen</span>;
      default:
        return <span className="text-sm text-muted-foreground">{status}</span>;
    }
  };


  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-foreground">Lade Auszahlungsdaten...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen"><p className="text-destructive max-w-md text-center">{error}</p></div>;
  }

  if (!summary) {
    return <div className="flex items-center justify-center h-screen"><p className="text-foreground">Keine Daten gefunden.</p></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Auszahlungen</h1>

        <Card className="bg-gradient-2 border-secondary">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-foreground/80 mb-2">Verfügbares Guthaben</p>
                <div className="text-5xl font-serif text-secondary-foreground">
                  {formatCurrency(summary.availableBalance)}
                </div>
                <p className="text-secondary-foreground/60 mt-2 text-sm">
                  Nächste geplante Auszahlung: {summary.nextPayoutDate}
                </p>
              </div>
              <DollarSignIcon className="w-16 h-16 text-secondary-foreground/40" strokeWidth={1.5} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-success" strokeWidth={1.5} />
                Diesen Monat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif text-foreground">{formatCurrency(summary.currentMonthEarnings)}</div>
              <p className={`text-sm mt-2 ${summary.lastMonthComparison >= 0 ? 'text-success' : 'text-destructive'}`}>
                {summary.lastMonthComparison.toFixed(1)}% vs. letzter Monat
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                Gesamt ({new Date().getFullYear()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif text-foreground">{formatCurrency(summary.totalYearEarnings)}</div>
              <p className="text-sm text-muted-foreground mt-2">Bisher in diesem Jahr</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Auszahlungshistorie</CardTitle>
            
            {/* --- Auszahlungs-Dialog-Button --- */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                  disabled={summary.availableBalance <= 0} // Deaktivieren, wenn kein Guthaben
                >
                  Guthaben auszahlen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Auszahlung beantragen</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Verfügbares Guthaben: {formatCurrency(summary.availableBalance)}.
                    Bitte geben Sie den gewünschten Auszahlungsbetrag ein.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="relative my-4">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="bg-background text-foreground border-border text-lg pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-neutral">Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={handlePayoutRequest}
                    disabled={isRequestingPayout || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > summary.availableBalance}
                  >
                    {isRequestingPayout ? (
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                    ) : (
                      'Auszahlung beantragen'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {/* --- ENDE Dialog-Button --- */}
            
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Keine Auszahlungshistorie vorhanden.</p>
            ) : (
                <div className="space-y-4">
                {history.map((transaction) => (
                    <div
                    key={transaction.id}
                    className="flex items-center justify-between py-4 border-b border-border last:border-0"
                    >
                    <div>
                        <div className="text-foreground font-medium">{formatCurrency(transaction.amount)}</div>
                        <div className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(transaction.status)}
                    </div>
                    </div>
                ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}