import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { UsersIcon, DollarSignIcon, BellIcon, PlusSquareIcon, RadioIcon, SendIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const stats = [
    { label: 'Abonnenten', value: '1,234', icon: UsersIcon, color: 'text-secondary' },
    { label: 'Monatsumsatz', value: '€24,680', icon: DollarSignIcon, color: 'text-success' },
    { label: 'Neue Benachrichtigungen', value: '42', icon: BellIcon, color: 'text-warning' },
  ];

  const quickActions = [
    { label: 'Neuer Beitrag', icon: PlusSquareIcon, path: '/post/new' },
    { label: 'Live gehen', icon: RadioIcon, path: '/live' },
    { label: 'Massen-Nachricht', icon: SendIcon, path: '/messages' },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-foreground">
            Willkommen zurück, {user?.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Hier ist eine Übersicht über Ihre Creator-Aktivitäten
          </p>
        </div>

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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Neueste Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { text: 'Neuer Abonnent: @user123', time: 'vor 5 Minuten' },
                { text: 'Ihr Beitrag hat 100 Likes erreicht', time: 'vor 1 Stunde' },
                { text: 'Neue Nachricht von @fan456', time: 'vor 2 Stunden' },
              ].map((notification, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <span className="text-foreground">{notification.text}</span>
                  <span className="text-sm text-muted-foreground">{notification.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
