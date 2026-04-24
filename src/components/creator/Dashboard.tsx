// src/components/creator/Dashboard.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { UsersIcon, DollarSignIcon, BellIcon, PlusSquareIcon, RadioIcon, SendIcon, CreditCardIcon, Loader2Icon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import type { Database } from '../../lib/database.types';
import { payoutService } from '../../services/payoutService';
import StreamConfigModal from './StreamConfigModal';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

interface StatData {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<StatData[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningStripe, setIsOpeningStripe] = useState(false);

  // --- NEUER STATE FÜR DAS MODAL ---
  const [showStreamConfigModal, setShowStreamConfigModal] = useState(false);
  // --- ENDE ---

  const handleOpenStripeDashboard = async () => {
    setIsOpeningStripe(true);
    const stripeWindow = window.open('', '_blank');
    if (stripeWindow) {
      stripeWindow.document.title = "Stripe Dashboard wird geladen...";
      stripeWindow.document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'>Lade Stripe Dashboard...</div>";
    }

    try {
      const { data, error } = await supabase.functions.invoke('connect-stripe-account', {
        body: {
          return_url: window.location.href.split('?')[0]
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        if (stripeWindow) {
          stripeWindow.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("Keine Weiterleitungs-URL erhalten.");
      }
    } catch (err: any) {
      if (stripeWindow) stripeWindow.close();
      console.error("Fehler beim Öffnen des Stripe Dashboards:", err);
      toast({
        title: "Fehler",
        description: "Das Stripe Dashboard konnte nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsOpeningStripe(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    // ... (Die fetchDashboardData-Logik bleibt exakt gleich) ...
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const summaryData = await payoutService.getPayoutSummary(user.id);
        const unreadCount = await notificationService.getUnreadNotificationCount(user.id);
        const recentNotifications = await notificationService.getRecentNotifications(user.id, 3);

        const loadedStats: StatData[] = [
          {
            label: 'Abonnenten',
            value: user.followersCount.toLocaleString('de-DE'),
            icon: UsersIcon,
            color: 'text-secondary'
          },
          {
            label: 'Umsatz (Dieser Monat)',
            value: formatCurrency(summaryData.currentMonthEarnings),
            icon: DollarSignIcon,
            color: 'text-success'
          },
          {
            label: 'Neue Benachrichtigungen',
            value: unreadCount.toLocaleString('de-DE'),
            icon: BellIcon,
            color: 'text-warning'
          },
        ];
        setStats(loadedStats);
        setNotifications(recentNotifications || []);
      } catch (err) {
        console.error("Fehler beim Laden der Dashboard-Daten:", err);
        setError("Dashboard-Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  // --- SCHNELLAKTIONEN AKTUALISIERT ---
  const quickActions = [
    { label: 'Neuer Beitrag', icon: PlusSquareIcon, onClick: () => navigate('/post/new') },
    { label: 'Live gehen', icon: RadioIcon, onClick: () => setShowStreamConfigModal(true) },
    { label: 'Massen-Nachricht', icon: SendIcon, onClick: () => navigate('/messages') },
    { 
      label: 'Stripe Dashboard', 
      icon: isOpeningStripe ? Loader2Icon : CreditCardIcon, 
      onClick: handleOpenStripeDashboard,
      disabled: isOpeningStripe
    },
  ];
  // --- ENDE ---

  // ... (formatTimeAgo Helper bleibt gleich) ...
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `vor ${Math.floor(interval)} Jahr(en)`;
    interval = seconds / 2592000;
    if (interval > 1) return `vor ${Math.floor(interval)} Monat(en)`;
    interval = seconds / 86400;
    if (interval > 1) return `vor ${Math.floor(interval)} Tag(en)`;
    interval = seconds / 3600;
    if (interval > 1) return `vor ${Math.floor(interval)} Stunde(n)`;
    interval = seconds / 60;
    if (interval > 1) return `vor ${Math.floor(interval)} Minute(n)`;
    return `vor ${Math.floor(seconds)} Sekunde(n)`;
  };


  return (
    <> {/* Fragment hinzugefügt, um Modal einzuschließen */}
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-serif text-foreground">
              Willkommen zurück, {user?.name || 'Creator'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Hier ist eine Übersicht über Ihre Creator-Aktivitäten
            </p>
          </div>

          {/* ... (Stats-Kacheln-Logik bleibt gleich) ... */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-card border-border h-32 animate-pulse">
                  <CardHeader></CardHeader>
                  <CardContent></CardContent>
                </Card>
              ))}
            </div>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && stats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-normal text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                      <Icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-serif text-foreground">{stat.value}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* --- Schnellaktionen-CARD (onClick geändert) --- */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Schnellaktionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={(action as any).disabled}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-auto py-6 flex-col gap-2 font-normal"
                    >
                      <Icon className={`w-6 h-6 ${(action as any).disabled ? 'animate-spin' : ''}`} strokeWidth={1.5} />
                      <span>{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ... (Benachrichtigungen-Card bleibt gleich) ... */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Neueste Benachrichtigungen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading && <p className="text-muted-foreground">Lade Benachrichtigungen...</p>}
                {!loading && notifications.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Keine neuen Benachrichtigungen.</p>
                )}
                {!loading && notifications.length > 0 && notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <span className="text-foreground">{notification.content}</span>
                    <span className="text-sm text-muted-foreground flex-shrink-0 ml-4">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- NEUES MODAL HINZUGEFÜGT --- */}
      <StreamConfigModal
        isOpen={showStreamConfigModal}
        onClose={() => setShowStreamConfigModal(false)}
      />
      {/* --- ENDE --- */}
    </>
  );
}