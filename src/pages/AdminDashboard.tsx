import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuthStore } from '../stores/authStore';
import AdminStats from '../components/admin/AdminStats';
import ReportedContentList from '../components/admin/ReportedContentList';
import { ShieldCheckIcon, LayoutDashboardIcon, FlagIcon } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (user && user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') {
        return null; // Or a loading spinner while redirecting
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            <div className="flex items-center gap-4 border-b border-border pb-6">
                <div className="p-3 bg-secondary/10 rounded-full">
                    <ShieldCheckIcon className="w-8 h-8 text-secondary" />
                </div>
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Verwalte die Plattform, Nutzer und Inhalte.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                        <LayoutDashboardIcon className="w-4 h-4 mr-2" /> Übersicht
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                        <FlagIcon className="w-4 h-4 mr-2" /> Meldungen
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <AdminStats />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Gemeldete Inhalte</h2>
                    </div>
                    <ReportedContentList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
