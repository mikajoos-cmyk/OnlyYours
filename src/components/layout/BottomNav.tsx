import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, SearchIcon, PlusSquareIcon, MessageCircleIcon, BarChart3Icon, CompassIcon, FilmIcon, DollarSignIcon, TrendingUpIcon, UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface BottomNavProps {
  isCreatorMode: boolean;
}

export default function BottomNav({ isCreatorMode }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Logik zum Erkennen der Tastatur (indirekt über Fokus)
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Wenn ein Input oder Textarea fokussiert wird, gehen wir davon aus, dass die Tastatur offen ist
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(true);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Kleine Verzögerung, falls der Fokus nur gewechselt wird
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            setIsKeyboardOpen(false);
        }
      }, 100);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

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
    { icon: TrendingUpIcon, label: 'Stats', path: '/statistics' }, // Hinzugefügt
    { icon: DollarSignIcon, label: 'Geld', path: '/payouts' },
    { icon: UserIcon, label: 'Profil', path: '/profile' },
  ];

  const navItems = isCreatorMode ? creatorNavItems : fanNavItems;

  // Wenn Tastatur offen ist, rendern wir nichts (oder verstecken es)
  if (isKeyboardOpen) {
      return null;
  }

  return (
    // FIX: "pb-safe" statt "safe-area-pb" genutzt, damit Padding korrekt angewendet wird
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden pb-safe">
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
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}