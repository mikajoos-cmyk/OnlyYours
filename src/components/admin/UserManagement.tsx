import { useState, useEffect, useMemo } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { SearchIcon, Loader2Icon, FilterIcon, ChevronDown, ChevronRight, GlobeIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../../lib/utils';

export default function UserManagement() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    // State für geöffnete Länder-Gruppen (Standardmäßig alle offen)
    const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                // Wir laden immer ALLE Länder (country: 'ALL') und filtern/gruppieren im Frontend
                const data = await adminService.getUsers({
                    search,
                    role: roleFilter,
                    country: 'ALL',
                    sortBy: 'created_at',
                    sortDesc: true
                });
                setUsers(data);

                // Initial alle Länder öffnen
                const countries = Array.from(new Set(data.map(u => u.country || 'Unbekannt')));
                const initialOpenState = countries.reduce((acc, country) => ({ ...acc, [country]: true }), {});
                setOpenCountries(prev => ({ ...initialOpenState, ...prev })); // Behalte Benutzer-Auswahl bei Refresh

            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [search, roleFilter]);

    // Gruppierungs-Logik
    const groupedUsers = useMemo(() => {
        const groups: Record<string, AdminUser[]> = {};
        users.forEach(user => {
            const country = user.country || 'Unbekannt';
            if (!groups[country]) groups[country] = [];
            groups[country].push(user);
        });
        return groups;
    }, [users]);

    const toggleCountry = (country: string) => {
        setOpenCountries(prev => ({ ...prev, [country]: !prev[country] }));
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

    // Helper für Aktivitäts-Status (z.B. aktiv in den letzten 30 Tagen)
    const isUserActive = (dateString: string) => {
        const date = new Date(dateString);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date > thirtyDaysAgo;
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-card p-4 rounded-lg border border-border">
                <div className="relative max-w-md w-full">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Suche nach Username oder Name..."
                        className="pl-9 bg-background border-border"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-[140px] bg-background border-border">
                            <div className="flex items-center gap-2">
                                <FilterIcon className="w-3 h-3" />
                                <SelectValue placeholder="Rolle" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Alle Rollen</SelectItem>
                            <SelectItem value="FAN">Fan</SelectItem>
                            <SelectItem value="CREATOR">Creator</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center p-12">
                    <Loader2Icon className="animate-spin w-8 h-8 text-secondary" />
                </div>
            )}

            {/* Grouped List */}
            {!isLoading && Object.entries(groupedUsers).length === 0 && (
                <div className="text-center p-12 text-muted-foreground bg-card rounded-lg border border-border">
                    Keine Benutzer gefunden.
                </div>
            )}

            {!isLoading && Object.entries(groupedUsers).sort().map(([country, groupUsers]) => {
                // Berechne Summen für den Header
                const totalEarnings = groupUsers.reduce((sum, u) => sum + u.total_earnings, 0);
                const totalSpent = groupUsers.reduce((sum, u) => sum + u.total_spent, 0);
                const isOpen = openCountries[country];

                return (
                    <Collapsible
                        key={country}
                        open={isOpen}
                        onOpenChange={() => toggleCountry(country)}
                        className="border border-border rounded-lg bg-card overflow-hidden"
                    >
                        {/* Country Header */}
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-neutral/30 hover:bg-neutral/50 transition-colors">
                            <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                <div className="flex items-center gap-2">
                                    <GlobeIcon className="w-4 h-4 text-secondary" />
                                    <span className="font-bold text-foreground text-lg">{country}</span>
                                    <Badge variant="outline" className="ml-2 bg-background">
                                        {groupUsers.length} Nutzer
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="hidden sm:block">
                                    <span className="text-muted-foreground mr-2">Einnahmen:</span>
                                    <span className="font-mono font-medium text-success">{formatCurrency(totalEarnings)}</span>
                                </div>
                                <div className="hidden sm:block">
                                    <span className="text-muted-foreground mr-2">Ausgaben:</span>
                                    <span className="font-mono font-medium text-foreground">{formatCurrency(totalSpent)}</span>
                                </div>
                            </div>
                        </CollapsibleTrigger>

                        {/* Users Table */}
                        <CollapsibleContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-background text-muted-foreground border-b border-border">
                                        <tr>
                                            <th className="p-3 pl-6 font-medium w-[250px]">User</th>
                                            <th className="p-3 font-medium">Status</th>
                                            <th className="p-3 font-medium hidden md:table-cell">Rolle</th>
                                            <th className="p-3 font-medium hidden sm:table-cell">Beigetreten</th>
                                            <th className="p-3 font-medium text-right">Einnahmen</th>
                                            <th className="p-3 font-medium text-right pr-6">Ausgaben</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupUsers.map(user => {
                                            const active = isUserActive(user.updated_at);
                                            return (
                                                <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-neutral/20 transition-colors">
                                                    <td className="p-3 pl-6 flex items-center gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarFallback>{user.display_name ? user.display_name.charAt(0) : '?'}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium text-foreground">{user.display_name}</div>
                                                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={cn("w-2 h-2 rounded-full", active ? "bg-success" : "bg-muted-foreground/30")} />
                                                            <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>
                                                                {active ? 'Aktiv' : 'Inaktiv'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 hidden md:table-cell">
                                                        <Badge variant={user.role === 'CREATOR' ? 'secondary' : user.role === 'ADMIN' ? 'destructive' : 'outline'} className="text-[10px] px-2 py-0">
                                                            {user.role}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-muted-foreground hidden sm:table-cell">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-success">
                                                        {user.total_earnings > 0 ? formatCurrency(user.total_earnings) : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-mono text-muted-foreground pr-6">
                                                        {user.total_spent > 0 ? formatCurrency(user.total_spent) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}