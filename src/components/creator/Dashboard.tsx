// src/components/creator/Dashboard.tsx
import { useState, useEffect } from 'react'; // Imports hinzugefügt
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { UsersIcon, DollarSignIcon, BellIcon, PlusSquareIcon, RadioIcon, SendIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService'; // Import des neuen Service
import type { Database } from '../../lib/database.types'; // Import für Typen
// --- NEUER IMPORT ---
import { payoutService, PayoutSummary } from '../../services/payoutService';
// --- ENDE ---

// Typ für Benachrichtigungen
type NotificationRow = Database['public']['Tables']['notifications']['Row'];

// Typ für die Stats-Kacheln
interface StatData {
  label: string;
  value: string;
  icon: React.ElementType; // Lucide Icon Komponente
  color: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // State für geladene Daten
  const [stats, setStats] = useState<StatData[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper zum Formatieren
  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Datenlade-Effekt
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return; // Nicht laden, wenn kein User vorhanden ist
      }

      setLoading(true);
      setError(null);

      try {
        // --- DATENABRUF AKTUALISIERT ---
        // PayoutSummary UND Benachrichtigungen parallel abrufen
        const [summaryData, unreadCount, recentNotifications] = await Promise.all([
          payoutService.getPayoutSummary(user.id), // Holt Einnahmen
          notificationService.getUnreadNotificationCount(user.id),
          notificationService.getRecentNotifications(user.id, 3)
        ]);
        // --- ENDE ---

        // Stats-Kacheln mit echten Daten füllen
        const loadedStats: StatData[] = [
          {
            label: 'Abonnenten',
            // user.followersCount (wird jetzt vom DB-Trigger aktualisiert)
            value: user.followersCount.toLocaleString('de-DE'),
            icon: UsersIcon,
            color: 'text-secondary'
          },
          {
            // --- KORREKTUR: Zeigt Monatsumsatz statt veraltetem Gesamtumsatz ---
            label: 'Umsatz (Dieser Monat)',
            value: formatCurrency(summaryData.currentMonthEarnings),
            icon: DollarSignIcon,
            color: 'text-success'
            // --- ENDE KORREKTUR ---
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
  }, [user]); // Abhängig vom user-Objekt

  // Schnellaktionen (bleiben gleich, da es nur Links sind)
  const quickActions = [
    { label: 'Neuer Beitrag', icon: PlusSquareIcon, path: '/post/new' },
    { label: 'Live gehen', icon: RadioIcon, path: '/live' }, // Hinweis: /live Route existiert noch nicht
    { label: 'Massen-Nachricht', icon: SendIcon, path: '/messages' },
  ];

  // Helper zum Formatieren von Zeitangaben
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

        {/* Lade- oder Fehlerzustand für Kacheln */}
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

        {/* Echte Stats-Kacheln */}
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

        {/* Schnellaktionen (unverändert) */}
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
                    onClick={() => navigate(action.path)}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-auto py-6 flex-col gap-2 font-normal"
                  >
                    <Icon className="w-6 h-6" strokeWidth={1.5} />
                    <span>{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Echte Benachrichtigungen */}
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
                  {/* HINWEIS: 'data' könnte für ein Klick-Event genutzt werden, z.B. navigate(notification.data.url) */}
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
  );
}