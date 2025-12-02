import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '../../lib/supabase';
import { Loader2Icon, DollarSignIcon, UsersIcon, ActivityIcon, GlobeIcon } from 'lucide-react';

interface AdminStatsData {
    total_revenue: number;
    total_users: number;
    active_users: number;
    country_stats: { country: string; count: number }[];
}

export default function AdminStats() {
    const [stats, setStats] = useState<AdminStatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase.rpc('get_admin_stats');
                if (error) throw error;
                setStats(data as AdminStatsData);
            } catch (err: any) {
                console.error("Error fetching admin stats:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) return <div className="flex justify-center p-8"><Loader2Icon className="animate-spin w-8 h-8 text-secondary" /></div>;
    if (error) return <div className="text-destructive p-4">Fehler beim Laden der Statistiken: {error}</div>;
    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gesamtumsatz</CardTitle>
                        <DollarSignIcon className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(stats.total_revenue)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Registrierte Nutzer</CardTitle>
                        <UsersIcon className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.total_users}</div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Aktive Nutzer (30 Tage)</CardTitle>
                        <ActivityIcon className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.active_users}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GlobeIcon className="w-5 h-5" /> Nutzer nach Ländern</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {stats.country_stats.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Keine Daten verfügbar.</p>
                        ) : (
                            stats.country_stats.map((item) => (
                                <div key={item.country} className="flex items-center justify-between border-b border-border/50 last:border-0 py-2">
                                    <span className="font-medium text-foreground">{item.country === 'OTHER' ? 'Andere' : item.country}</span>
                                    <span className="text-muted-foreground">{item.count} Nutzer</span>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
