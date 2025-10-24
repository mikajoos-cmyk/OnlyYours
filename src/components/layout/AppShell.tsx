// src/components/layout/AppShell.tsx
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils'; // Importiere cn, falls noch nicht geschehen

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { currentRole } = useAppStore();

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCreatorMode={currentRole === 'creator'} />
        {/* Hauptinhalt - Scrollbar hier ausblenden */}
        <main className={cn(
          "flex-1 pb-20 md:pb-0 md:ml-64 overflow-y-auto",
          "chat-messages-scrollbar" // <--- KLASSE HIER HINZUGEFÜGT
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