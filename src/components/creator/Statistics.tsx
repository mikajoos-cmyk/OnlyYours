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
import { statisticsService, MonthlyStatData, TopFan, EngagementStats, TimeRange } from '../../services/statisticsService';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarIcon } from 'lucide-react';

export default function Statistics() {
  const { user } = useAuthStore();

  // State für Filter
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');

  // --- NEU: State für den aktiven Tab ---
  const [activeTab, setActiveTab] = useState('revenue');

  // Daten States
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
        // Daten parallel abrufen mit dem ausgewählten Zeitraum
        const [revenue, subscribers, fans, engagement] = await Promise.all([
          statisticsService.getRevenueData(user.id, timeRange),
          statisticsService.getSubscriberGrowth(user.id, timeRange),
          statisticsService.getTopFans(user.id, 5, timeRange),
          statisticsService.getEngagementStats(user.id, timeRange)
        ]);

        setRevenueData(revenue || []);
        setSubscriberData(subscribers || []);
        setTopFans(fans || []);
        setEngagementStats(engagement);

      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [user?.id, timeRange]);

  // Formatierungs-Helper
  const formatCurrency = (value: number) => `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => `${value.toLocaleString('de-DE')}`;

  const renderCurrencyTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-md shadow-lg text-sm">
          <p className="text-muted-foreground mb-1">{payload[0].payload.month}</p>
          <p className="text-foreground font-bold">{`Umsatz: ${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  const renderNumberTooltip = (props: any) => {
     const { active, payload } = props;
     if (active && payload && payload.length) {
       return (
         <div className="bg-card border border-border p-3 rounded-md shadow-lg text-sm">
           <p className="text-muted-foreground mb-1">{payload[0].payload.month}</p>
           <p className="text-foreground font-bold">{`Neue Abos: ${formatNumber(payload[0].value)}`}</p>
         </div>
       );
     }
     return null;
   };

  if (!user) return null;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header Bereich mit Titel und Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif text-foreground">Statistiken</h1>
            <p className="text-muted-foreground mt-1">Überblick über deine Performance und Einnahmen.</p>
          </div>

          <div className="w-full md:w-48">
            <Select value={timeRange} onValueChange={(val: TimeRange) => setTimeRange(val)}>
              <SelectTrigger className="bg-card border-border text-foreground">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Zeitraum wählen" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                <SelectItem value="3m">Letzte 3 Monate</SelectItem>
                <SelectItem value="6m">Letzte 6 Monate</SelectItem>
                <SelectItem value="1y">Letztes Jahr</SelectItem>
                <SelectItem value="all">Gesamt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
           <div className="flex items-center justify-center h-64">
             <p className="text-muted-foreground animate-pulse">Lade Daten...</p>
           </div>
        ) : (
          /* --- ÄNDERUNG: Tabs kontrolliert durch activeTab State --- */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-card border border-border w-full md:w-auto flex-wrap h-auto p-1">
              <TabsTrigger value="revenue" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Umsatz</TabsTrigger>
              <TabsTrigger value="subscribers" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Abonnenten</TabsTrigger>
              <TabsTrigger value="engagement" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Engagement</TabsTrigger>
              <TabsTrigger value="fans" className="flex-1 md:flex-none data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Top Fans</TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Umsatzentwicklung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--color-muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="hsl(var(--color-muted-foreground))"
                          tickFormatter={(val) => `€${val}`}
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip content={renderCurrencyTooltip} cursor={{ stroke: 'hsl(var(--color-border))', strokeWidth: 1 }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Umsatz"
                          stroke="hsl(var(--color-secondary))"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "hsl(var(--color-card))", stroke: "hsl(var(--color-secondary))", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "hsl(var(--color-secondary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Abonnenten-Neuzugänge</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subscriberData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--color-muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="hsl(var(--color-muted-foreground))"
                          allowDecimals={false}
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip content={renderNumberTooltip} cursor={{ fill: 'hsl(var(--color-border) / 0.3)' }} />
                        <Bar
                          dataKey="value"
                          name="Abonnenten"
                          fill="hsl(var(--color-secondary))"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {engagementStats && (
              <TabsContent value="engagement" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Durchschn. Likes</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-4xl font-serif text-secondary">{engagementStats.avgLikes.toFixed(1)}</div>
                      <p className="text-xs text-muted-foreground mt-1">pro veröffentlichtem Beitrag</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Durchschn. Kommentare</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-4xl font-serif text-secondary">{engagementStats.avgComments.toFixed(1)}</div>
                      <p className="text-xs text-muted-foreground mt-1">pro veröffentlichtem Beitrag</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Gesamtanzahl Posts</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-4xl font-serif text-secondary">{engagementStats.totalPosts}</div>
                      <p className="text-xs text-muted-foreground mt-1">im gewählten Zeitraum</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}

            <TabsContent value="fans" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Top Fans (nach Umsatz)</CardTitle>
                </CardHeader>
                <CardContent>
                  {topFans.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Keine Daten für diesen Zeitraum verfügbar.</p>
                  ) : (
                      <div className="space-y-4">
                      {topFans.map((fan, index) => (
                          <div key={fan.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                              <span className="text-xl font-serif text-secondary w-6 text-center">{index + 1}</span>
                              <Avatar className="w-10 h-10 border border-border">
                                  <AvatarImage src={fan.avatar || undefined} alt={fan.name} />
                                  <AvatarFallback className="bg-neutral text-secondary">{fan.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-foreground font-medium">{fan.name}</span>
                          </div>
                          <span className="text-secondary font-bold">
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
        )}
      </div>
    </div>
  );
}