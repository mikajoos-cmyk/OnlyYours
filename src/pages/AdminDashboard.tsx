// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuthStore } from '../stores/authStore';
import AdminStats from '../components/admin/AdminStats';
import ReportedContentList from '../components/admin/ReportedContentList';
import UserManagement from '../components/admin/UserManagement'; // Import
import { ShieldCheckIcon, LayoutDashboardIcon, FlagIcon, UsersIcon } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        // Redirekt wenn kein User oder kein Admin
        // Hinweis: role 'admin' muss lowercase/uppercase konsistent geprüft werden
        if (!user || user.role.toLowerCase() !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role.toLowerCase() !== 'admin') return null;

    return (
        <div className="container mx-auto py-8 px-4 space-y-8 min-h-screen">
            <div className="flex items-center gap-4 border-b border-border pb-6">
                <div className="p-3 bg-secondary/10 rounded-full">
                    <ShieldCheckIcon className="w-8 h-8 text-secondary" />
                </div>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Plattform-Verwaltung</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                        <LayoutDashboardIcon className="w-4 h-4 mr-2" /> Übersicht
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                        <UsersIcon className="w-4 h-4 mr-2" /> Benutzer
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                        <FlagIcon className="w-4 h-4 mr-2" /> Meldungen
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <AdminStats />
                </TabsContent>

                <TabsContent value="users">
                    <UserManagement />
                </TabsContent>

                <TabsContent value="reports">
                    <ReportedContentList />
                </TabsContent>
            </Tabs>
        </div>
    );
}