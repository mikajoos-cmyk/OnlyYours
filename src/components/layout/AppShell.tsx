// src/components/layout/AppShell.tsx
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { currentRole } = useAppStore();

  // --- NEUE LOGIK: Vollbild-Modus für Live-Streams ---
  const isLiveStreamPage = location.pathname.startsWith('/live');
  // --- ENDE ---

  // Scrollbar-Logik (unverändert)
  const routesToHideScrollbar = [
    '/discover',
    '/feed',
    '/vault'
  ];
  const shouldHideScrollbar = routesToHideScrollbar.includes(location.pathname);

  // --- KORREKTUR: Wenn Live-Stream, nur children rendern ---
  if (isLiveStreamPage) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Die <main> füllt den gesamten Bildschirm, keine Menüs */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }
  // --- ENDE KORREKTUR ---

  // Normales Layout für alle anderen Seiten
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCreatorMode={currentRole === 'creator'} />
        <main className={cn(
          "flex-1 pb-20 md:pb-0 md:ml-64 overflow-y-auto",
          !shouldHideScrollbar && "chat-messages-scrollbar",
          shouldHideScrollbar && "scrollbar-hide"
        )}>
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
      <BottomNav isCreatorMode={currentRole === 'creator'} />
    </div>
  );
}