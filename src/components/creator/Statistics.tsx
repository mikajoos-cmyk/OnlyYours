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

export default function Statistics() {
  const revenueData = [
    { month: 'Jan', revenue: 18000 },
    { month: 'Feb', revenue: 21000 },
    { month: 'Mar', revenue: 24000 },
    { month: 'Apr', revenue: 22000 },
    { month: 'Mai', revenue: 26000 },
    { month: 'Jun', revenue: 28000 },
  ];

  const subscriberData = [
    { month: 'Jan', subscribers: 850 },
    { month: 'Feb', subscribers: 920 },
    { month: 'Mar', subscribers: 1050 },
    { month: 'Apr', subscribers: 1100 },
    { month: 'Mai', subscribers: 1180 },
    { month: 'Jun', subscribers: 1234 },
  ];

  const topFans = [
    { name: 'Anna Schmidt', spent: '€1,250', avatar: 'https://placehold.co/100x100' },
    { name: 'Max Müller', spent: '€980', avatar: 'https://placehold.co/100x100' },
    { name: 'Lisa Weber', spent: '€850', avatar: 'https://placehold.co/100x100' },
    { name: 'Tom Fischer', spent: '€720', avatar: 'https://placehold.co/100x100' },
    { name: 'Sarah Klein', spent: '€650', avatar: 'https://placehold.co/100x100' },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-serif text-foreground">Statistiken</h1>

        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              Umsatz
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              Abonnenten
            </TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              Engagement
            </TabsTrigger>
            <TabsTrigger value="fans" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              Top Fans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Umsatzentwicklung</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 12%, 25%)" />
                    <XAxis dataKey="month" stroke="hsl(50, 30%, 92%)" />
                    <YAxis stroke="hsl(50, 30%, 92%)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(276, 35%, 24%)',
                        border: '1px solid hsl(280, 12%, 25%)',
                        color: 'hsl(50, 30%, 92%)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(45, 63%, 52%)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscribers" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Abonnentenwachstum</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={subscriberData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(280, 12%, 25%)" />
                    <XAxis dataKey="month" stroke="hsl(50, 30%, 92%)" />
                    <YAxis stroke="hsl(50, 30%, 92%)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(276, 35%, 24%)',
                        border: '1px solid hsl(280, 12%, 25%)',
                        color: 'hsl(50, 30%, 92%)',
                      }}
                    />
                    <Bar dataKey="subscribers" fill="hsl(45, 63%, 52%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Durchschn. Likes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif text-secondary">342</div>
                  <p className="text-sm text-muted-foreground mt-2">pro Beitrag</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Durchschn. Kommentare</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif text-secondary">28</div>
                  <p className="text-sm text-muted-foreground mt-2">pro Beitrag</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Engagement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-serif text-secondary">8.5%</div>
                  <p className="text-sm text-muted-foreground mt-2">durchschnittlich</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fans" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Top 5 Fans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topFans.map((fan, index) => (
                    <div
                      key={fan.name}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-serif text-secondary w-8">
                          #{index + 1}
                        </span>
                        <img
                          src={fan.avatar}
                          alt={fan.name}
                          className="w-10 h-10 rounded-full"
                        />
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
