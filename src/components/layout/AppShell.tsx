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

  const isLiveStreamPage = location.pathname.startsWith('/live');

  // Seiten, die ihre eigene Scroll-Logik haben (kein Padding unten nötig)
  const isFullScreenPage = [
    '/discover',
    '/feed',
    '/vault',
    '/messages' // Messages auch hier, damit es volle Höhe nutzt
  ].includes(location.pathname);

  if (isLiveStreamPage) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    );
  }

  return (
    // h-[100dvh] sorgt für korrekte Höhe auf Mobile Browsern
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar isCreatorMode={currentRole === 'creator'} />

        <main className={cn(
          "flex-1 flex flex-col min-h-0 w-full md:ml-64 transition-all duration-200",
          // Auf Mobile fügen wir padding-bottom hinzu, wenn es KEINE Fullscreen-Seite ist,
          // damit der Inhalt nicht hinter der BottomNav verschwindet.
          !isFullScreenPage && "pb-16 md:pb-0 overflow-y-auto chat-messages-scrollbar",
          // Fullscreen-Seiten (Feed, Messages) managen ihren Scroll selbst
          isFullScreenPage && "overflow-hidden h-full"
        )}>
          {/* Wrapper für max-width, außer bei Fullscreen Seiten */}
          <div className={cn(
            "h-full w-full",
            !isFullScreenPage && "max-w-7xl mx-auto"
          )}>
            {children}
          </div>
        </main>
      </div>
      <BottomNav isCreatorMode={currentRole === 'creator'} />
    </div>
  );
}