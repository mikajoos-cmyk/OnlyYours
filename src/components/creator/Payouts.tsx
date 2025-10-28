import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DollarSignIcon, TrendingUpIcon, CalendarIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// HINWEIS: Services müssen noch implementiert werden
// import { payoutService } from '../../services/payoutService';
// import { statisticsService } from '../../services/statisticsService';

// Annahmen für Datenstrukturen
interface Transaction {
  id: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending';
}

interface PayoutsData {
  availableBalance: number;
  nextPayoutDate: string;
  currentMonthEarnings: number;
  lastMonthComparison: number;
  totalYearEarnings: number;
  history: Transaction[];
}

export default function Payouts() {
  const { user } = useAuthStore();
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        // HINWEIS: Die folgenden Zeilen sind auskommentiert, da die Services noch nicht existieren.
        // Ersetzen Sie dies durch echte Service-Aufrufe.
        // const history = await payoutService.getPayoutHistory(user.id);
        // const balance = await payoutService.getAvailableBalance(user.id);
        // const monthlyEarnings = await statisticsService.getCurrentMonthEarnings(user.id);
        // const totalEarnings = await statisticsService.getTotalEarnings(user.id, { year: new Date().getFullYear() });

        // Mock-Daten als Platzhalter
        const mockData: PayoutsData = {
          availableBalance: 4680,
          nextPayoutDate: '1. Februar 2024',
          currentMonthEarnings: 24680,
          lastMonthComparison: 12,
          totalYearEarnings: 148200,
          history: [
            { id: '1', date: '2024-01-15', amount: '€2,450', status: 'completed' },
            { id: '2', date: '2024-01-01', amount: '€2,280', status: 'completed' },
          ],
        };
        setData(mockData);

      } catch (err) {
        setError('Fehler beim Laden der Auszahlungsdaten.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, [user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Lade Auszahlungsdaten...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen"><p className="text-destructive">{error}</p></div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-screen"><p>Keine Daten gefunden.</p></div>;
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
                  €{data.availableBalance.toLocaleString()}
                </div>
                <p className="text-secondary-foreground/60 mt-2 text-sm">
                  Nächste Auszahlung: {data.nextPayoutDate}
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
              <div className="text-3xl font-serif text-foreground">€{data.currentMonthEarnings.toLocaleString()}</div>
              <p className="text-sm text-success mt-2">+{data.lastMonthComparison}% vs. letzter Monat</p>
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
              <div className="text-3xl font-serif text-foreground">€{data.totalYearEarnings.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-2">Bisher in diesem Jahr</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Auszahlungshistorie</CardTitle>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
              Guthaben auszahlen
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.history.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-foreground font-medium">{transaction.amount}</div>
                    <div className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-success">Abgeschlossen</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
