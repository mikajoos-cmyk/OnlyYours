// src/components/admin/AdminStats.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { adminService, AdminDashboardStats } from '../../services/adminService';
import { Loader2Icon, DollarSignIcon, UsersIcon, ActivityIcon, TrendingUpIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminStats() {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await adminService.getStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    if (isLoading) return <div className="flex justify-center p-12"><Loader2Icon className="animate-spin" /></div>;
    if (!stats) return <div>Keine Daten.</div>;

    const formatCurrency = (val: number) => `€${val.toLocaleString()}`;

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gesamtumsatz</CardTitle>
                        <DollarSignIcon className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.total_revenue)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Registrierte Nutzer</CardTitle>
                        <UsersIcon className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_users}</div>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Aktive Nutzer (30d)</CardTitle>
                        <ActivityIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active_users}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base">Umsatzentwicklung (30 Tage)</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenue_chart}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--color-success))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--color-success))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="hsl(var(--color-muted-foreground))" />
                                <YAxis stroke="hsl(var(--color-muted-foreground))" />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }} />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--color-success))" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader><CardTitle className="text-base">Nutzerwachstum (30 Tage)</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.user_chart}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--color-secondary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--color-secondary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).getDate().toString()} stroke="hsl(var(--color-muted-foreground))" />
                                <YAxis stroke="hsl(var(--color-muted-foreground))" />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--color-card))', borderColor: 'hsl(var(--color-border))' }} />
                                <Area type="monotone" dataKey="value" stroke="hsl(var(--color-secondary))" fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}