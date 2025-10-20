import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, SearchIcon, PlusSquareIcon, MessageCircleIcon, BarChart3Icon, CompassIcon, FilmIcon, DollarSignIcon, TrendingUpIcon, UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/appStore';

interface SidebarProps {
  isCreatorMode: boolean;
}

export default function Sidebar({ isCreatorMode }: SidebarProps) {
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
    { icon: FilmIcon, label: 'Content Vault', path: '/vault' },
    { icon: PlusSquareIcon, label: 'Neuer Beitrag', path: '/post/new' },
    { icon: MessageCircleIcon, label: 'Nachrichten', path: '/messages' },
    { icon: TrendingUpIcon, label: 'Statistiken', path: '/statistics' },
    { icon: DollarSignIcon, label: 'Auszahlungen', path: '/payouts' },
    { icon: UserIcon, label: 'Profil', path: '/profile' },
  ];

  const navItems = isCreatorMode ? creatorNavItems : fanNavItems;

  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 flex-col border-r border-border bg-card">
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors font-normal',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-foreground hover:bg-neutral hover:text-secondary'
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
