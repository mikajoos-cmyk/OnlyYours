// src/components/layout/AppShell.tsx
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';
import { useVisualViewport } from '../../hooks/useVisualViewport'; // <--- Hook importieren

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { currentRole } = useAppStore();

  // <--- Hook aktivieren: Setzt --app-height bei Tastatur-Änderung
  useVisualViewport();

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
      // Nutzung der variablen Höhe
      <div className="flex flex-col bg-background overflow-hidden" style={{ height: 'var(--app-height, 100dvh)' }}>
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    );
  }

  return (
    // ÄNDERUNG: style={{ height: ... }} statt h-[100dvh]
    // Das div passt sich nun exakt dem verfügbaren Platz an
    <div
      className="w-full flex flex-col bg-background overflow-hidden"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar isCreatorMode={currentRole === 'creator'} />

        <main className={cn(
          "flex-1 flex flex-col min-h-0 w-full md:ml-64 transition-all duration-200",
          // Padding unten nur wenn NICHT Fullscreen (damit BottomNav nichts verdeckt)
          !isFullScreenPage && "pb-16 md:pb-0 overflow-y-auto chat-messages-scrollbar",
          // Fullscreen Seiten managen Scroll selbst
          isFullScreenPage && "overflow-hidden h-full"
        )}>
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