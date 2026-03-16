// src/components/admin/UserManagement.tsx
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

const getAgeGroup = (age: number) => {
    if (age === -1) return 'Unbekannt';
    if (age < 18) return 'Unter 18 (Prüfen)';
    if (age <= 24) return '18-24';
    if (age <= 34) return '25-34';
    if (age <= 44) return '35-44';
    if (age <= 54) return '45-54';
    return '55+';
};

// --- NEUE FUNKTION: Prüft Aktivität basierend auf last_seen ---
const isUserActive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const date = new Date(lastSeen);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date > thirtyDaysAgo;
};
// -------------------------------------------------------------

export default function UserManagement() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [groupBy, setGroupBy] = useState<'none' | 'country' | 'age'>('none');

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const [userToProcess, setUserToProcess] = useState<AdminUser | null>(null);
    const [suspensionDialogOpen, setSuspensionDialogOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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

    const handleSuspensionClick = (user: AdminUser) => {
        setUserToProcess(user);
        setSuspensionReason('');
        setSuspensionDialogOpen(true);
    };

    const confirmSuspension = async () => {
        if (!userToProcess) return;
        setIsProcessing(true);
        try {
            const newStatus = !userToProcess.is_suspended;
            await adminService.toggleUserSuspension(userToProcess.id, newStatus, suspensionReason);

            setUsers(prev => prev.map(u => u.id === userToProcess.id ? { ...u, is_suspended: newStatus } : u));

            toast({
                title: newStatus ? "Nutzer gesperrt" : "Nutzer entsperrt",
                description: `${userToProcess.username} wurde ${newStatus ? 'gesperrt' : 'entsperrt'}.`
            });
            setSuspensionDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Fehler", description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setUserToProcess(null);
            setSuspensionReason('');
        }
    };

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

    const TableHeader = () => (
        <thead className="bg-background text-muted-foreground border-b border-border">
            <tr>
                <th className="p-3 pl-6 font-medium w-[250px]">User</th>
                <th className="p-3 font-medium">Status</th>
                {groupBy !== 'age' && <th className="p-3 font-medium hidden md:table-cell">Alter</th>}
                {groupBy !== 'country' && <th className="p-3 font-medium hidden md:table-cell">Land</th>}
                <th className="p-3 font-medium hidden sm:table-cell">Identität</th>
                <th className="p-3 font-medium hidden sm:table-cell">Rolle</th>
                <th className="p-3 font-medium hidden lg:table-cell">Beigetreten</th>
                <th className="p-3 font-medium text-right">Einnahmen</th>
                <th className="p-3 font-medium text-right pr-6">Aktionen</th>
            </tr>
        </thead>
    );

    const UserRow = ({ user }: { user: AdminUser }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        // --- AKTUALISIERT: Nutzt jetzt last_seen ---
        const active = isUserActive(user.last_seen);
        const age = calculateAge(user.birthdate);

        const statusText = active ? 'Aktiv' : 'Inaktiv';
        const lastSeenDate = user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Nie';
        const identityStatus = user.identity_verification_status || 'none';

        return (
            <>
                <tr 
                    className={cn(
                        "border-b border-border/50 last:border-0 transition-colors cursor-pointer", 
                        user.is_banned ? "bg-destructive/10 hover:bg-destructive/20" : "hover:bg-neutral/20",
                        isExpanded && "bg-neutral/10"
                    )}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <td className="p-3 pl-6 flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback>{user.display_name ? user.display_name.charAt(0) : '?'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium text-foreground flex items-center gap-2">
                                {user.display_name}
                                {user.is_suspended && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 bg-orange-600">SUSPENDED</Badge>}
                                {user.is_banned && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">BANNED</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                        </div>
                    </td>
                    <td className="p-3">
                        <div className="flex items-center gap-1.5" title={`Zuletzt gesehen: ${lastSeenDate}`}>
                            <div className={cn("w-2 h-2 rounded-full", active ? "bg-success" : "bg-muted-foreground/30")} />
                            <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>
                                {statusText}
                            </span>
                        </div>
                    </td>
                    {groupBy !== 'age' && <td className="p-3 hidden md:table-cell text-muted-foreground">{age > 0 ? age : '-'}</td>}
                    {groupBy !== 'country' && <td className="p-3 hidden md:table-cell text-muted-foreground">{user.country || '-'}</td>}
                    
                    <td className="p-3 hidden sm:table-cell">
                        {user.role === 'CREATOR' && (
                            <Badge 
                                variant={identityStatus === 'verified' ? 'success' : identityStatus === 'rejected' ? 'destructive' : 'outline'}
                                className="text-[10px] px-2 py-0"
                            >
                                {identityStatus}
                            </Badge>
                        )}
                    </td>

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
                        <div className="flex justify-end gap-2">
                            {user.is_suspended ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSuspensionClick(user);
                                    }}
                                    className="text-foreground border-border hover:bg-neutral"
                                >
                                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                                    Entsperren
                                </Button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSuspensionClick(user);
                                        }}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <BanIcon className="w-4 h-4 mr-1" />
                                        Sperren
                                    </Button>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
                {isExpanded && user.role === 'CREATOR' && (
                    <tr className="bg-muted/5">
                        <td colSpan={10} className="p-6 border-b border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Echter Name</p>
                                    <p className="text-sm font-medium">{user.real_name || 'Nicht verifiziert'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Adresse</p>
                                    <p className="text-sm leading-relaxed">
                                        {user.address_street || '-'}<br />
                                        {user.address_zip} {user.address_city}<br />
                                        {user.address_country}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Geburtsdatum</p>
                                    <p className="text-sm">{user.birthdate || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Externe ID (Stripe)</p>
                                    <p className="text-[10px] font-mono break-all text-muted-foreground">{user.external_verification_id || '-'}</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
            </>
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

            {/* Suspension Confirmation Dialog */}
            <AlertDialog open={suspensionDialogOpen} onOpenChange={setSuspensionDialogOpen}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                            {userToProcess?.is_suspended ? <CheckCircleIcon className="text-success" /> : <AlertTriangleIcon className="text-destructive" />}
                            {userToProcess?.is_suspended ? "Benutzer entsperren?" : "Benutzer sperren?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            {userToProcess?.is_suspended
                                ? <div>Möchtest du die Sperrung für {userToProcess.username} wirklich aufheben?</div>
                                : (
                                    <div className="space-y-4 pt-2">
                                        <p>Möchtest du {userToProcess?.username} wirklich sperren? Der Nutzer sieht beim Login einen Sperrbildschirm.</p>
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-xs font-bold text-muted-foreground uppercase">Grund der Sperrung (für den Nutzer sichtbar):</label>
                                            <Input 
                                                placeholder="z.B. Verstoß gegen Richtlinie X..." 
                                                value={suspensionReason}
                                                onChange={(e) => setSuspensionReason(e.target.value)}
                                                className="bg-background border-border"
                                            />
                                        </div>
                                    </div>
                                )
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-neutral">Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSuspension}
                            className={cn(userToProcess?.is_suspended ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90")}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2Icon className="w-4 h-4 animate-spin" /> : (userToProcess?.is_suspended ? "Entsperren" : "Sperren")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}