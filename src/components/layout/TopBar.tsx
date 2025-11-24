// src/components/layout/TopBar.tsx
import { BellIcon, UserIcon, MessageCircleIcon, DollarSignIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import { cn } from '../../lib/utils';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // removeNotification hinzufügen
  const { unreadCount, recentNotifications, markAsRead, removeNotification } = useNotificationStore();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed in TopBar:", error);
    }
  };

  const handleNotificationClick = (notificationData: any) => {
    if (notificationData.sender_id) {
      navigate('/messages');
    }
  };

  // --- Handler für Löschen ---
  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Verhindert, dass das DropdownItem-Click-Event feuert (Navigation)
    e.preventDefault();  // Verhindert, dass das Dropdown sich sofort schließt (optional)
    removeNotification(id);
  };

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

          <DropdownMenu
            onOpenChange={(open) => {
              if (open && unreadCount > 0 && user?.id) {
                markAsRead(user.id);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-secondary hover:bg-neutral relative"
              >
                <BellIcon className="w-5 h-5" />
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
                      "relative flex items-start gap-3 cursor-pointer hover:bg-neutral pr-8 group", // pr-8 für Platz für das X
                      !notification.is_read && "bg-neutral"
                    )}
                    onClick={() => handleNotificationClick(notification.data)}
                  >
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm font-medium text-foreground leading-none truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.content}</p>
                    </div>

                    {/* --- LÖSCHEN BUTTON --- */}
                    <div
                      role="button"
                      className="absolute right-2 top-2 p-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      title="Löschen"
                    >
                      <XIcon className="w-3 h-3" />
                    </div>
                    {/* --- ENDE BUTTON --- */}

                  </DropdownMenuItem>
                ))
              )}

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-secondary hover:bg-neutral cursor-pointer justify-center"
              >
                Alle anzeigen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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