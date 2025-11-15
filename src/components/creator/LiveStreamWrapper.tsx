// src/components/creator/LiveStreamWrapper.tsx
import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { userService, UserProfile } from '../../services/userService';
import LiveStreamView from './LiveStreamView';
import { Loader2Icon } from 'lucide-react';

export default function LiveStreamWrapper() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStreamData = async () => {
      setIsLoading(true);

      try {
        let targetUser: UserProfile | null = null;

        if (username) {
          // Szenario: Zuschauer (oder Creator, der sein eigenes Live-Profil besucht)
          console.log(`Lade Stream für: ${username}`);
          targetUser = await userService.getUserByUsername(username);
        } else if (currentUser) {
          // Szenario: Creator klickt auf "Live Gehen" (kein :username in URL)
          console.log(`Lade Stream für aktuellen User: ${currentUser.username}`);
          // Wir laden das Profil des aktuellen Users (um den Stream-Key zu erhalten)
          targetUser = await userService.getUserByUsername(currentUser.username!);
        }

        if (!targetUser) {
          throw new Error('Creator nicht gefunden.');
        }

        setCreator(targetUser);
      } catch (error) {
        console.error("Fehler beim Laden der Stream-Daten:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isLoadingAuth) {
        loadStreamData();
    }
  }, [username, currentUser, isLoadingAuth]);

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <Loader2Icon className="h-12 w-12 animate-spin text-secondary" />
      </div>
    );
  }

  if (!creator) {
    // Wenn User nicht gefunden, zurück zur Entdecken-Seite
    return <Navigate to="/discover" replace />;
  }

  // Bestimmen, ob der eingeloggte Benutzer der Streamer ist
  const isStreamer = currentUser?.id === creator.id;

  return (
    <LiveStreamView
      isStreamer={isStreamer}
      creator={creator}
    />
  );
}