import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { adminService, AdminDashboardStats, TimeRange } from '../../services/adminService';
import { Loader2Icon, DollarSignIcon, UsersIcon, ActivityIcon, CalendarIcon, BarChart2Icon, PieChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

export default function AdminStats() {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('daily');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await adminService.getStats(timeRange);
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [timeRange]);

    // Berechne kumulative Daten
    const chartData = useMemo(() => {
        if (!stats) return { revenue: [], users: [] };

        if (chartMode === 'daily') {
            return { revenue: stats.revenue_chart, users: stats.user_chart };
        }

        // Kumulativ berechnen
        let revSum = 0;
        const revenue = stats.revenue_chart.map(item => {
            revSum += item.value;
            return { ...item, value: revSum };
        });

        let userSum = 0;
        const users = stats.user_chart.map(item => {
            userSum += item.value;
            return { ...item, value: userSum };
        });

        return { revenue, users };
    }, [stats, chartMode]);

    const periodStats = useMemo(() => {
        if (!stats) return { revenue: 0, newUsers: 0, profit: 0 };
        const revenue = stats.revenue_chart.reduce((acc, item) => acc + item.value, 0);
        const newUsers = stats.user_chart.reduce((acc, item) => acc + item.value, 0);
        // Approx 1.5% Stripe Fees + 20% App Share => Profit = Revenue * (0.20 - 0.015)
        const profit = revenue * (0.20 - 0.015);
        return { revenue, newUsers, profit };
    }, [stats]);

    if (isLoading) return <div className="flex justify-center p-12"><Loader2Icon className="animate-spin" /></div>;
    if (!stats) return <div>Keine Daten.</div>;

    const formatCurrency = (val: number) => `€${val.toLocaleString()}`;

    return (
        <div className="space-y-8">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
                    <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as any)} className="w-full">
                        <TabsList>
                            <TabsTrigger value="daily">Täglich</TabsTrigger>
                            <TabsTrigger value="cumulative">Kumuliert</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                    <SelectTrigger className="w-[180px] bg-card border-border">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <SelectValue placeholder="Zeitraum" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Letzte 7 Tage</SelectItem>
                        <SelectItem value="30d">Letzte 30 Tage</SelectItem>
                        <SelectItem value="3m">Letzte 3 Monate</SelectItem>
                        <SelectItem value="1y">Letztes Jahr</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Cards */}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Umsatz ({timeRange})</CardTitle>
                        <DollarSignIcon className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(periodStats.revenue)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gewinn (Netto)</CardTitle>
                        <DollarSignIcon className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(periodStats.profit)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Neue Nutzer</CardTitle>
                        <UsersIcon className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periodStats.newUsers}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Aktive Nutzer</CardTitle>
                        <ActivityIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active_users}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Umsatzentwicklung</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.revenue}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--color-success))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--color-success))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} tickFormatter={(v) => `${v}€`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }}
                                    formatter={(value: number) => [formatCurrency(value), chartMode === 'daily' ? 'Umsatz' : 'Kumuliert']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--color-success))" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><UsersIcon className="w-4 h-4" /> Nutzerwachstum</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.users}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--color-secondary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--color-secondary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }}
                                    formatter={(value: number) => [value, chartMode === 'daily' ? 'Neue Nutzer' : 'Gesamt']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--color-secondary))" fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Profit Chart */}
            <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSignIcon className="w-4 h-4" /> Nettogewinn (App Share 20% - Stripe 1.5%)</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.revenue.map(item => ({
                            ...item,
                            profit: (item.value * 0.20) - (item.value * 0.015) // 20% App Share - 1.5% Stripe Costs
                        }))}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                            <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--color-muted-foreground))" fontSize={12} tickFormatter={(v) => `${v.toFixed(0)}€`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }}
                                formatter={(value: number) => [formatCurrency(value), chartMode === 'daily' ? 'Gewinn' : 'Kumulierter Gewinn']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Area type="monotone" dataKey="profit" stroke="#f59e0b" fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Charts Row 2 - Länderverteilung */}

            <Card className="bg-card border-border">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="w-4 h-4" /> Nutzer nach Ländern (Top 10)</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.country_stats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--color-border))" />
                            <XAxis type="number" stroke="hsl(var(--color-muted-foreground))" fontSize={12} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--color-foreground))" fontSize={12} width={100} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar dataKey="value" fill="hsl(var(--color-secondary))" radius={[0, 4, 4, 0]} barSize={20}>
                                {stats.country_stats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`hsl(var(--color-secondary) / ${1 - (index * 0.05)})`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div >
    );
}