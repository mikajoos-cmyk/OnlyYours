import { useState, useEffect } from 'react';
import { adminService, AdminUser } from '../../services/adminService';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { SearchIcon, Loader2Icon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export default function UserManagement() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const data = await adminService.getUsers(search);
                setUsers(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="space-y-4">
            <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Suche nach Username oder Name..."
                    className="pl-9 bg-card border-border"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Card className="bg-card border-border">
                <CardContent className="p-0">
                    <div className="rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral/50 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="p-4 font-medium">User</th>
                                    <th className="p-4 font-medium">Rolle</th>
                                    <th className="p-4 font-medium hidden md:table-cell">Beigetreten</th>
                                    <th className="p-4 font-medium text-right">Einnahmen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={4} className="p-8 text-center"><Loader2Icon className="animate-spin mx-auto" /></td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Keine User gefunden.</td></tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="border-b border-border last:border-0 hover:bg-neutral/30 transition-colors">
                                            <td className="p-4 flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback>{user.display_name ? user.display_name.charAt(0) : '?'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-foreground">{user.display_name}</div>
                                                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={user.role === 'CREATOR' ? 'secondary' : user.role === 'ADMIN' ? 'destructive' : 'outline'}>
                                                    {user.role}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-muted-foreground hidden md:table-cell">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right font-mono">
                                                {user.total_earnings > 0 ? `€${user.total_earnings.toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}