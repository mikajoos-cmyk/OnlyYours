// src/components/layout/TopBar.tsx
import { BellIcon, UserIcon, MessageCircleIcon, DollarSignIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel, // Hinzugefügt
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
// --- NEUE IMPORTS ---
import { useNotificationStore } from '../../stores/notificationStore';
import { cn } from '../../lib/utils';
// --- ENDE ---

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // --- NEUER STATUS ---
  // Holen Sie sich den Status aus dem neuen Store
  const { unreadCount, recentNotifications, markAsRead } = useNotificationStore();
  // --- ENDE ---

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed in TopBar:", error);
    }
  };

  // --- NEU: Klick-Handler für Benachrichtigungen ---
  const handleNotificationClick = (notificationData: any) => {
    // (Hier könnten Sie basierend auf notification.type zu /messages oder /profile/:username navigieren)
    // Vorerst navigieren wir zu den Nachrichten, wenn es eine Nachricht ist
    if (notificationData.sender_id) {
      navigate('/messages');
    }
  };

  // --- NEU: Icon-Helfer ---
  const getNotificationIcon = (type: string) => {
    if (type === 'NEW_MESSAGE') {
      return <MessageCircleIcon className="w-4 h-4 text-secondary" />;
    }
    if (type === 'SUBSCRIPTION' || type === 'PAY_PER_VIEW') {
      return <DollarSignIcon className="w-4 h-4 text-success" />;
    }
    return <BellIcon className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img
            src="/logo.png"
            alt="OnlyYours Logo"
            className="h-8 md:h-12 lg:h-16 w-auto"
          />
        </div>

        <div className="flex items-center gap-4">

          {/* --- AKTUALISIERTE GLOCKE (DropdownMenu) --- */}
          <DropdownMenu
            onOpenChange={(open) => {
              // Wenn das Menü geöffnet wird UND ungelesene Nachrichten vorhanden sind
              if (open && unreadCount > 0 && user?.id) {
                markAsRead(user.id); // Markiere als gelesen
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-secondary hover:bg-neutral relative" // 'relative' hinzugefügt
              >
                <BellIcon className="w-5 h-5" />
                {/* Badge für ungelesene Nachrichten */}
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-card text-card-foreground border-border">
              <DropdownMenuLabel className="font-medium text-foreground">Benachrichtigungen</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />

              {recentNotifications.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground italic focus:bg-card cursor-default">
                  Keine neuen Benachrichtigungen
                </DropdownMenuItem>
              ) : (
                recentNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 cursor-pointer hover:bg-neutral",
                      !notification.is_read && "bg-neutral" // Ungelesene hervorheben
                    )}
                    onClick={() => handleNotificationClick(notification.data)}
                  >
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground leading-none">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.content}</p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate('/profile')} // (Oder zu einer dedizierten /notifications Seite)
                className="text-secondary hover:bg-neutral cursor-pointer justify-center"
              >
                Alle anzeigen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* --- ENDE GLOCKE --- */}


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card text-card-foreground border-border">
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-foreground hover:bg-neutral cursor-pointer"
              >
                <UserIcon className="mr-2 w-4 h-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-foreground hover:bg-neutral cursor-pointer"
              >
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}