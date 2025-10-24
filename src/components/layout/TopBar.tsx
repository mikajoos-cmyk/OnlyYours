import { BellIcon, UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    window.location.reload(); // Beibehalten oder durch navigate('/') ersetzen
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        {/* --- Änderung beginnt hier --- */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.PNG" alt="OnlyYours Logo" className="h-24 md:h-32 lg:h-16 w-auto" /> {/* Logo hinzugefügt */}
        </div>
        {/* --- Änderung endet hier --- */}

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:text-secondary hover:bg-neutral"
          >
            <BellIcon className="w-5 h-5" />
          </Button>

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
              {/* Profil-Link zur Profilseite */}
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