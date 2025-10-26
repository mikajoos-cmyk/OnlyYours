// src/components/layout/AppShell.tsx
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom'; // useLocation ist bereits importiert
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils'; // cn ist bereits importiert

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation(); // Holen der aktuellen Location
  const { currentRole } = useAppStore();

  // --- NEU: Definiere hier die Pfade, auf denen die Scrollbar versteckt werden soll ---
  const routesToHideScrollbar = [
    '/discover', // Beispiel: DiscoveryFeed
    '/feed',
    '/vault'// Beispiel: SubscriberFeed
    // Füge hier weitere Pfade hinzu, z.B. '/profile/:username'
    // Beachte bei dynamischen Routen: Du müsstest evtl. komplexere Logik verwenden
    // oder eine spezifischere Klasse im jeweiligen Komponenten-Top-Level hinzufügen,
    // die dann übergeordnet das Styling beeinflusst (weniger empfohlen).
    // Für dieses Beispiel bleiben wir bei exakten Pfaden.
  ];

  // Prüfen, ob der aktuelle Pfad in der Liste ist
  const shouldHideScrollbar = routesToHideScrollbar.includes(location.pathname);
  // --- ENDE NEU ---

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCreatorMode={currentRole === 'creator'} />
        <main className={cn(
          "flex-1 pb-20 md:pb-0 md:ml-64 overflow-y-auto", // Basis-Styling
          // --- Hinzufügen der Scrollbar-Klassen basierend auf der Bedingung ---
          !shouldHideScrollbar && "chat-messages-scrollbar", // Angepasste Scrollbar anzeigen
          shouldHideScrollbar && "scrollbar-hide" // Scrollbar komplett ausblenden
          // --- Ende Anpassung ---
        )}>
          {/* Max-width Container hinzugefügt für Konsistenz */}
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
      <BottomNav isCreatorMode={currentRole === 'creator'} />
    </div>
  );
}