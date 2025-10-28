import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';

// HINWEIS: Service muss noch implementiert werden
// import { statisticsService } from '../../services/statisticsService';

// Annahmen für Datenstrukturen
interface ChartData { month: string; value: number; }
interface TopFan { name: string; spent: string; avatar: string; }
interface EngagementStats { avgLikes: number; avgComments: number; engagementRate: number; }

export default function Statistics() {
  const { user } = useAuthStore();
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [subscriberData, setSubscriberData] = useState<ChartData[]>([]);
  const [topFans, setTopFans] = useState<TopFan[]>([]);
  const [engagementStats, setEngagementStats] = useState<EngagementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        // HINWEIS: Die folgenden Zeilen sind auskommentiert, da der Service noch nicht existiert.
        // Ersetzen Sie dies durch echte Service-Aufrufe.
        // const revenue = await statisticsService.getRevenueData(user.id);
        // const subscribers = await statisticsService.getSubscriberGrowth(user.id);
        // const fans = await statisticsService.getTopFans(user.id);
        // const engagement = await statisticsService.getEngagementStats(user.id);

        // Mock-Daten als Platzhalter
        setRevenueData([
          { month: 'Jan', value: 18000 }, { month: 'Feb', value: 21000 }, { month: 'Mar', value: 24000 },
          { month: 'Apr', value: 22000 }, { month: 'Mai', value: 26000 }, { month: 'Jun', value: 28000 },
        ]);
        setSubscriberData([
          { month: 'Jan', value: 850 }, { month: 'Feb', value: 920 }, { month: 'Mar', value: 1050 },
          { month: 'Apr', value: 1100 }, { month: 'Mai', value: 1180 }, { month: 'Jun', value: 1234 },
        ]);
        setTopFans([
          { name: 'Anna Schmidt', spent: '€1,250', avatar: 'https://placehold.co/100x100' },
          { name: 'Max Müller', spent: '€980', avatar: 'https://placehold.co/100x100' },
        ]);
        setEngagementStats({ avgLikes: 342, avgComments: 28, engagementRate: 8.5 });

      } catch (err) {
        setError('Fehler beim Laden der Statistiken.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, [user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Lade Statistiken...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen"><p className="text-destructive">{error}</p></div>;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Statistiken</h1>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="revenue">Umsatz</TabsTrigger>
            <TabsTrigger value="subscribers">Abonnenten</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="fans">Top Fans</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Umsatzentwicklung</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 12%, 25%)" />
                    <XAxis dataKey="month" stroke="hsl(50, 30%, 92%)" />
                    <YAxis stroke="hsl(50, 30%, 92%)" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(276, 35%, 24%)', border: '1px solid hsl(280, 12%, 25%)' }} />
                    <Line type="monotone" dataKey="value" name="Umsatz" stroke="hsl(45, 63%, 52%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribers" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Abonnentenwachstum</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={subscriberData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 12%, 25%)" />
                    <XAxis dataKey="month" stroke="hsl(50, 30%, 92%)" />
                    <YAxis stroke="hsl(50, 30%, 92%)" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(276, 35%, 24%)', border: '1px solid hsl(280, 12%, 25%)' }} />
                    <Bar dataKey="value" name="Abonnenten" fill="hsl(45, 63%, 52%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {engagementStats && (
            <TabsContent value="engagement" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Durchschn. Likes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-serif text-secondary">{engagementStats.avgLikes}</div>
                    <p className="text-sm text-muted-foreground mt-2">pro Beitrag</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Durchschn. Kommentare</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-serif text-secondary">{engagementStats.avgComments}</div>
                    <p className="text-sm text-muted-foreground mt-2">pro Beitrag</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Engagement Rate</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-serif text-secondary">{engagementStats.engagementRate.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground mt-2">durchschnittlich</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="fans" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Top 5 Fans</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topFans.map((fan, index) => (
                    <div key={fan.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-serif text-secondary w-8">#{index + 1}</span>
                        <img src={fan.avatar} alt={fan.name} className="w-10 h-10 rounded-full" />
                        <span className="text-foreground">{fan.name}</span>
                      </div>
                      <span className="text-secondary font-medium">{fan.spent}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
