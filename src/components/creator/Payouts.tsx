import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DollarSignIcon, TrendingUpIcon, CalendarIcon, Loader2Icon, Building2Icon, SettingsIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
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
import { supabase } from '../../lib/supabase'; // Supabase für Function Call

export default function Payouts() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [history, setHistory] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');

  // Loading States für Aktionen
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchPayouts = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryData, historyData] = await Promise.all([
        payoutService.getPayoutSummary(user.id),
        payoutService.getPayoutHistory(user.id, 10)
      ]);

      setSummary(summaryData);
      setHistory(historyData);

    } catch (err: any) {
      // Fehler ignorieren, wenn noch keine Daten da sind, aber Loggen
      console.error(err);
      setError('Konnte Finanzdaten nicht laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [user?.id]);

  // Handler für Stripe Connect (Bankkonto verbinden ODER Dashboard öffnen)
  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      // Ruft die Edge Function auf.
      // Das Backend entscheidet: Onboarding-Link (Neu) oder Dashboard-Link (Login)
      const { data, error } = await supabase.functions.invoke('connect-stripe-account');

      if (error) throw error;
      if (data?.url) {
        // Weiterleitung zu Stripe (entweder Onboarding oder Dashboard zum Bearbeiten)
        window.location.href = data.url;
      } else {
        throw new Error("Keine Weiterleitungs-URL erhalten.");
      }
    } catch (err: any) {
      console.error("Fehler beim Verbinden mit Stripe:", err);
      toast({ title: "Fehler", description: "Verbindung zu Stripe fehlgeschlagen.", variant: "destructive" });
      setIsConnectingStripe(false); // Nur im Fehlerfall zurücksetzen, sonst leiten wir eh weiter
    }
  };

  // Handler für Auszahlung
  const handlePayoutRequest = async () => {
    if (!user?.id || !summary) return;

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRequestingPayout(true);
    try {
      const { error } = await supabase.functions.invoke('payout-to-creator', {
        body: { amount }
      });

      if (error) throw error;

      toast({
        title: "Auszahlung unterwegs!",
        description: `${formatCurrency(amount)} wurden an dein Bankkonto gesendet.`,
      });

      await fetchPayouts();
      setPayoutAmount('');

    } catch (err: any) {
      console.error("Fehler bei Auszahlung:", err);
      toast({ title: "Fehler", description: err.message || "Auszahlung fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const getStatusBadge = (status: PayoutTransaction['status']) => {
    switch (status) {
      case 'COMPLETED': return <span className="text-sm text-success">Ausgezahlt</span>;
      case 'PENDING': return <span className="text-sm text-warning">In Bearbeitung</span>;
      case 'FAILED': return <span className="text-sm text-destructive">Fehlgeschlagen</span>;
      default: return <span className="text-sm text-muted-foreground">{status}</span>;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-foreground">Lade Daten...</p></div>;

  // Fallback für Summary, falls noch keine Daten existieren
  const safeSummary = summary || {
      availableBalance: 0,
      currentMonthEarnings: 0,
      lastMonthComparison: 0,
      totalYearEarnings: 0,
      nextPayoutDate: '-'
  };

  // Prüfen, ob der User mit Stripe verbunden ist
  const isStripeConnected = !!user?.stripe_account_id;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header mit optionalem Einstellungs-Button */}
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-serif text-foreground">Auszahlungen</h1>

            {isStripeConnected && (
                <Button
                    variant="outline"
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe}
                    className="bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-neutral"
                >
                    {isConnectingStripe ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4 mr-2" />}
                    Einstellungen / IBAN ändern
                </Button>
            )}
        </div>

        {/* --- STATUS KARTE --- */}
        <Card className="bg-gradient-2 border-secondary relative overflow-hidden">
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-foreground/80 mb-2">Verfügbares Guthaben</p>
                <div className="text-5xl font-serif text-secondary-foreground">
                  {formatCurrency(safeSummary.availableBalance)}
                </div>
                <p className="text-secondary-foreground/60 mt-2 text-sm">
                  {!isStripeConnected
                    ? "Bitte Bankkonto verbinden, um Auszahlungen zu erhalten."
                    : "Bereit zur Auszahlung via Stripe Express."}
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
              <div className="text-3xl font-serif text-foreground">{formatCurrency(safeSummary.currentMonthEarnings)}</div>
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
              <div className="text-3xl font-serif text-foreground">{formatCurrency(safeSummary.totalYearEarnings)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Auszahlung</CardTitle>

            {/* --- LOGIK: VERBINDEN VS. AUSZAHLEN --- */}
            {!isStripeConnected ? (
                <Button
                    onClick={handleConnectStripe}
                    disabled={isConnectingStripe}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                    {isConnectingStripe ? <Loader2Icon className="animate-spin mr-2" /> : <Building2Icon className="mr-2 w-4 h-4" />}
                    Bankkonto verbinden
                </Button>
            ) : (
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    disabled={safeSummary.availableBalance <= 0}
                    >
                    Guthaben auszahlen
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Auszahlung beantragen</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Verfügbares Guthaben: {formatCurrency(safeSummary.availableBalance)}.
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
                        disabled={isRequestingPayout || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > safeSummary.availableBalance}
                    >
                        {isRequestingPayout ? (
                        <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                        'Auszahlung bestätigen'
                        )}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}

          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Keine Auszahlungshistorie vorhanden.</p>
            ) : (
                <div className="space-y-4">
                {history.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                        <div>
                            <div className="text-foreground font-medium">{formatCurrency(transaction.amount)}</div>
                            <div className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</div>
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