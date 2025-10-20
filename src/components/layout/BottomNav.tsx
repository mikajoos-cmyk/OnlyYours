import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, SearchIcon, PlusSquareIcon, MessageCircleIcon, BarChart3Icon, CompassIcon, FilmIcon, UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BottomNavProps {
  isCreatorMode: boolean;
}

export default function BottomNav({ isCreatorMode }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const fanNavItems = [
    { icon: CompassIcon, label: 'Entdecken', path: '/discover' },
    { icon: HomeIcon, label: 'Feed', path: '/feed' },
    { icon: SearchIcon, label: 'Suchen', path: '/search' },
    { icon: MessageCircleIcon, label: 'Nachrichten', path: '/messages' },
    { icon: UserIcon, label: 'Profil', path: '/profile' },
  ];

  const creatorNavItems = [
    { icon: BarChart3Icon, label: 'Dashboard', path: '/dashboard' },
    { icon: FilmIcon, label: 'Vault', path: '/vault' },
    { icon: PlusSquareIcon, label: 'Erstellen', path: '/post/new' },
    { icon: MessageCircleIcon, label: 'Nachrichten', path: '/messages' },
    { icon: UserIcon, label: 'Profil', path: '/profile' },
  ];

  const navItems = isCreatorMode ? creatorNavItems : fanNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive
                  ? 'text-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
