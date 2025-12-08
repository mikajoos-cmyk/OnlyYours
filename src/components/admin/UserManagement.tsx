import { useState, useEffect, useMemo } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { SearchIcon, Loader2Icon, FilterIcon, ChevronDown, ChevronRight, GlobeIcon, CalendarIcon, BanIcon, CheckCircleIcon, AlertTriangleIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../../lib/utils';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '../ui/alert-dialog';
import { useToast } from '../../hooks/use-toast';

// Helper: Alter berechnen
const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return -1;
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }
    return age;
};

// Helper: Altersgruppen bestimmen
const getAgeGroup = (age: number) => {
    if (age === -1) return 'Unbekannt';
    if (age < 18) return 'Unter 18 (Prüfen)';
    if (age <= 24) return '18-24';
    if (age <= 34) return '25-34';
    if (age <= 44) return '35-44';
    if (age <= 54) return '45-54';
    return '55+';
};

export default function UserManagement() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Filter & Ansicht
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [groupBy, setGroupBy] = useState<'none' | 'country' | 'age'>('none');

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    // Ban Dialog State
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
    const [isProcessingBan, setIsProcessingBan] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const data = await adminService.getUsers({
                    search,
                    role: roleFilter,
                    country: 'ALL',
                    sortBy: 'created_at',
                    sortDesc: true
                });
                setUsers(data);
                setOpenGroups({});
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [search, roleFilter]);

    const handleBanClick = (user: AdminUser) => {
        setUserToBan(user);
        setBanDialogOpen(true);
    };

    const confirmBan = async () => {
        if (!userToBan) return;
        setIsProcessingBan(true);
        try {
            const newStatus = !userToBan.is_banned;
            await adminService.toggleUserBan(userToBan.id, newStatus);

            // Lokales Update der Liste
            setUsers(prev => prev.map(u => u.id === userToBan.id ? { ...u, is_banned: newStatus } : u));

            toast({
                title: newStatus ? "Nutzer gesperrt" : "Sperre aufgehoben",
                description: `${userToBan.username} wurde ${newStatus ? 'gesperrt' : 'entsperrt'}.`
            });
            setBanDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessingBan(false);
            setUserToBan(null);
        }
    };

    // Gruppierungs-Logik
    const groupedUsers = useMemo(() => {
        if (groupBy === 'none') {
            return { 'Alle Benutzer': users };
        }

        const groups: Record<string, AdminUser[]> = {};

        users.forEach(user => {
            let key = 'Unbekannt';

            if (groupBy === 'country') {
                key = user.country || 'Unbekannt';
            } else if (groupBy === 'age') {
                const age = calculateAge(user.birthdate);
                key = getAgeGroup(age);
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(user);
        });

        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, AdminUser[]>);
    }, [users, groupBy]);

    const toggleGroup = (key: string) => {
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
    const isUserActive = (dateString: string) => {
        const date = new Date(dateString);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date > thirtyDaysAgo;
    };

    // --- Komponenten ---

    const TableHeader = () => (
        <thead className="bg-background text-muted-foreground border-b border-border">
            <tr>
                <th className="p-3 pl-6 font-medium w-[250px]">User</th>
                <th className="p-3 font-medium">Status</th>
                {groupBy !== 'age' && <th className="p-3 font-medium hidden md:table-cell">Alter</th>}
                {groupBy !== 'country' && <th className="p-3 font-medium hidden md:table-cell">Land</th>}
                <th className="p-3 font-medium hidden sm:table-cell">Rolle</th>
                <th className="p-3 font-medium hidden lg:table-cell">Beigetreten</th>
                <th className="p-3 font-medium text-right">Einnahmen</th>
                <th className="p-3 font-medium text-right pr-6">Aktionen</th>
            </tr>
        </thead>
    );

    const UserRow = ({ user }: { user: AdminUser }) => {
        const active = isUserActive(user.updated_at);
        const age = calculateAge(user.birthdate);

        return (
            <tr className={cn("border-b border-border/50 last:border-0 transition-colors", user.is_banned ? "bg-destructive/10 hover:bg-destructive/20" : "hover:bg-neutral/20")}>
                <td className="p-3 pl-6 flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                        <AvatarFallback>{user.display_name ? user.display_name.charAt(0) : '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                            {user.display_name}
                            {user.is_banned && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">BANNED</Badge>}
                        </div>
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
                {groupBy !== 'age' && <td className="p-3 hidden md:table-cell text-muted-foreground">{age > 0 ? age : '-'}</td>}
                {groupBy !== 'country' && <td className="p-3 hidden md:table-cell text-muted-foreground">{user.country || '-'}</td>}
                <td className="p-3 hidden sm:table-cell">
                    <Badge variant={user.role === 'CREATOR' ? 'secondary' : user.role === 'ADMIN' ? 'default' : 'outline'} className="text-[10px] px-2 py-0">
                        {user.role}
                    </Badge>
                </td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right font-mono text-success">
                    {user.total_earnings > 0 ? formatCurrency(user.total_earnings) : '-'}
                </td>
                <td className="p-3 text-right pr-6">
                    <Button
                        variant={user.is_banned ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => handleBanClick(user)}
                        className={cn(user.is_banned ? "text-foreground border-border hover:bg-neutral" : "text-destructive hover:text-destructive hover:bg-destructive/10")}
                    >
                        {user.is_banned ? <CheckCircleIcon className="w-4 h-4 mr-1" /> : <BanIcon className="w-4 h-4 mr-1" />}
                        {user.is_banned ? "Freigeben" : "Sperren"}
                    </Button>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-4 justify-between bg-card p-4 rounded-lg border border-border">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    <div className="relative max-w-md w-full">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Suche nach Username oder Name..."
                            className="pl-9 bg-background border-border"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

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

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Gruppierung:</span>
                    <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)} className="w-auto">
                        <TabsList className="bg-background border border-border">
                            <TabsTrigger value="none">Keine</TabsTrigger>
                            <TabsTrigger value="country">Land</TabsTrigger>
                            <TabsTrigger value="age">Alter</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Content Area */}
            {!isLoading && (
                <div className="space-y-4">
                    {Object.entries(groupedUsers).length === 0 && <div className="text-center p-8 text-muted-foreground">Keine User gefunden.</div>}

                    {Object.entries(groupedUsers).map(([groupKey, groupUsers]) => {
                        const totalEarnings = groupUsers.reduce((sum, u) => sum + u.total_earnings, 0);
                        const isOpen = openGroups[groupKey] !== false;

                        if (groupBy === 'none') {
                            return (
                                <Card key={groupKey} className="bg-card border-border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <TableHeader />
                                            <tbody>
                                                {groupUsers.map(user => <UserRow key={user.id} user={user} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            );
                        }

                        return (
                            <Collapsible
                                key={groupKey}
                                open={isOpen}
                                onOpenChange={() => toggleGroup(groupKey)}
                                className="border border-border rounded-lg bg-card overflow-hidden"
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-neutral/30 hover:bg-neutral/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        <div className="flex items-center gap-2">
                                            {groupBy === 'country' ? <GlobeIcon className="w-4 h-4 text-secondary" /> : <CalendarIcon className="w-4 h-4 text-secondary" />}
                                            <span className="font-bold text-foreground text-lg">{groupKey}</span>
                                            <Badge variant="outline" className="ml-2 bg-background">
                                                {groupUsers.length} Nutzer
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-6 text-sm">
                                        <div>
                                            <span className="text-muted-foreground mr-2">Einnahmen:</span>
                                            <span className="font-mono font-medium text-success">{formatCurrency(totalEarnings)}</span>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <TableHeader />
                                            <tbody>
                                                {groupUsers.map(user => <UserRow key={user.id} user={user} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        );
                    })}
                </div>
            )}

            {/* Ban Confirmation Dialog */}
            <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                            {userToBan?.is_banned ? <CheckCircleIcon className="text-success" /> : <AlertTriangleIcon className="text-destructive" />}
                            {userToBan?.is_banned ? "Benutzer entsperren?" : "Benutzer sperren?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToBan?.is_banned
                                ? `Möchtest du die Sperre für ${userToBan.username} wirklich aufheben? Der Nutzer kann sich danach wieder einloggen.`
                                : `Möchtest du ${userToBan?.username} wirklich sperren? Der Nutzer wird sofort ausgeloggt und kann sich nicht mehr anmelden.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-neutral">Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmBan}
                            className={cn(userToBan?.is_banned ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}
                            disabled={isProcessingBan}
                        >
                            {isProcessingBan ? <Loader2Icon className="w-4 h-4 animate-spin" /> : (userToBan?.is_banned ? "Entsperren" : "Sperren")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}