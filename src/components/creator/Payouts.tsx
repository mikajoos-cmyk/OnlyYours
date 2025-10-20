import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { DollarSignIcon, TrendingUpIcon, CalendarIcon } from 'lucide-react';

export default function Payouts() {
  const transactions = [
    { id: '1', date: '2024-01-15', amount: '€2,450', status: 'completed' },
    { id: '2', date: '2024-01-01', amount: '€2,280', status: 'completed' },
    { id: '3', date: '2023-12-15', amount: '€2,150', status: 'completed' },
    { id: '4', date: '2023-12-01', amount: '€1,980', status: 'completed' },
  ];

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
                  €4,680
                </div>
                <p className="text-secondary-foreground/60 mt-2 text-sm">
                  Nächste Auszahlung: 1. Februar 2024
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
              <div className="text-3xl font-serif text-foreground">€24,680</div>
              <p className="text-sm text-success mt-2">+12% vs. letzter Monat</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-secondary" strokeWidth={1.5} />
                Gesamt (2024)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif text-foreground">€148,200</div>
              <p className="text-sm text-muted-foreground mt-2">6 Monate</p>
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
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-foreground font-medium">{transaction.amount}</div>
                    <div className="text-sm text-muted-foreground">{transaction.date}</div>
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
