// src/components/creator/Statistics.tsx
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
// --- NEUE IMPORTS ---
import { statisticsService, MonthlyStatData, TopFan, EngagementStats } from '../../services/statisticsService';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'; // Avatar importieren
// --- ENDE NEUE IMPORTS ---


export default function Statistics() {
  const { user } = useAuthStore();
  // States mit neuen Typen
  const [revenueData, setRevenueData] = useState<MonthlyStatData[]>([]);
  const [subscriberData, setSubscriberData] = useState<MonthlyStatData[]>([]);
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
        // --- ECHTE DATENABFRAGE ---
        // Daten parallel abrufen
        const [revenue, subscribers, fans, engagement] = await Promise.all([
          statisticsService.getRevenueData(user.id),
          statisticsService.getSubscriberGrowth(user.id),
          statisticsService.getTopFans(user.id, 5), // Limit auf 5
          statisticsService.getEngagementStats(user.id)
        ]);

        setRevenueData(revenue || []);
        setSubscriberData(subscribers || []);
        setTopFans(fans || []);
        setEngagementStats(engagement);
        // --- ENDE ECHTE DATENABFRAGE ---

      } catch (err: any) {
        setError('Fehler beim Laden der Statistiken. Stellen Sie sicher, dass die Supabase RPC-Funktionen (get_monthly_revenue, get_monthly_subscriber_growth, get_top_fans) existieren.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, [user?.id]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p className="text-foreground">Lade Statistiken...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen"><p className="text-destructive">{error}</p></div>;
  }

  // Helper zur Formatierung der Y-Achse für Euro
  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE')}`;
  // Helper zur Formatierung der Y-Achse für Zahlen
  const formatNumber = (value: number) => `${value.toLocaleString('de-DE')}`;
  // Helper zur Formatierung der Tooltips für Währung
  const renderCurrencyTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-2 rounded-md shadow-lg">
          <p className="text-muted-foreground">{payload[0].payload.month}</p>
          <p className="text-foreground">{`Umsatz: ${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };
  // Helper zur Formatierung der Tooltips für Zahlen
  const renderNumberTooltip = (props: any) => {
     const { active, payload } = props;
     if (active && payload && payload.length) {
       return (
         <div className="bg-card border border-border p-2 rounded-md shadow-lg">
           <p className="text-muted-foreground">{payload[0].payload.month}</p>
           <p className="text-foreground">{`Neue Abonnenten: ${formatNumber(payload[0].value)}`}</p>
         </div>
       );
     }
     return null;
   };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Statistiken</h1>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Umsatz</TabsTrigger>
            <TabsTrigger value="subscribers" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Abonnenten</TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Engagement</TabsTrigger>
            <TabsTrigger value="fans" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Top Fans</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Umsatzentwicklung (Letzte 6 Monate)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" />
                    <YAxis stroke="hsl(var(--color-muted-foreground))" tickFormatter={formatCurrency} />
                    <Tooltip content={renderCurrencyTooltip} />
                    <Line type="monotone" dataKey="value" name="Umsatz" stroke="hsl(var(--color-secondary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--color-secondary))" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribers" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Abonnenten-Neuzugänge (Letzte 6 Monate)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={subscriberData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--color-muted-foreground))" />
                    <YAxis stroke="hsl(var(--color-muted-foreground))" allowDecimals={false} tickFormatter={formatNumber} />
                    <Tooltip content={renderNumberTooltip} />
                    <Bar dataKey="value" name="Abonnenten" fill="hsl(var(--color-secondary))" radius={[4, 4, 0, 0]} />
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
                    <div className="text-4xl font-serif text-secondary">{engagementStats.avgLikes.toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground mt-2">pro veröffentlichtem Beitrag</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Durchschn. Kommentare</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-serif text-secondary">{engagementStats.avgComments.toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground mt-2">pro veröffentlichtem Beitrag</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader><CardTitle>Gesamtanzahl Posts</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-4xl font-serif text-secondary">{engagementStats.totalPosts}</div>
                    <p className="text-sm text-muted-foreground mt-2">veröffentlicht</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="fans" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle>Top 5 Fans (nach Umsatz)</CardTitle></CardHeader>
              <CardContent>
                {topFans.length === 0 ? (
                    <p className="text-muted-foreground">Noch keine Fan-Daten vorhanden.</p>
                ) : (
                    <div className="space-y-4">
                    {topFans.map((fan, index) => (
                        <div key={fan.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-serif text-secondary w-8">#{index + 1}</span>
                            <Avatar className="w-10 h-10">
                                <AvatarImage src={fan.avatar || undefined} alt={fan.name} />
                                <AvatarFallback className="bg-neutral text-secondary">{fan.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-foreground">{fan.name}</span>
                        </div>
                        <span className="text-secondary font-medium">
                            {formatCurrency(fan.spent)}
                        </span>
                        </div>
                    ))}
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}