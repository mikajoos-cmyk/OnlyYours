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

  const isLiveStreamPage = location.pathname.startsWith('/live');

  // Seiten, die ihre eigene Scroll-Logik haben
  const isFullScreenPage = [
    '/discover',
    '/feed',
    '/vault',
    '/messages'
  ].includes(location.pathname);

  if (isLiveStreamPage) {
    return (
      <div className="app-container bg-background">
        <main className="flex-1 relative h-full w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    // PFOTENCARD STRATEGIE: Nutzung der .app-container Klasse aus index.css
    // Diese erzwingt 100dvh und verhindert Body-Scroll
    <div className="app-container bg-background">
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar isCreatorMode={currentRole === 'creator'} />

        <main
          className={cn(
            "flex-1 flex flex-col min-h-0 w-full md:ml-64 transition-all duration-200",
            // WICHTIG: Das Scrollen passiert HIER im 'main' Element, nicht im Body
            isFullScreenPage ? "overflow-hidden h-full" : "overflow-y-auto chat-messages-scrollbar"
          )}
          // PADDING FIX:
          // Da die BottomNav 'fixed' ist, müssen wir unten Platz reservieren.
          // 'env(safe-area-inset-bottom)' schützt vor der iPhone Home-Bar.
          // '5rem' ist die Höhe der Nav (h-16 = 4rem) + 1rem Puffer.
          style={{
            paddingBottom: isFullScreenPage ? 0 : 'calc(5rem + env(safe-area-inset-bottom))'
          }}
        >
          <div className={cn(
            "w-full",
            // Bei Fullscreen Seiten soll das Kind die volle Höhe füllen
            isFullScreenPage ? "h-full" : "h-auto max-w-7xl mx-auto"
          )}>
            {children}
          </div>
        </main>
      </div>

      <BottomNav isCreatorMode={currentRole === 'creator'} />
    </div>
  );
}