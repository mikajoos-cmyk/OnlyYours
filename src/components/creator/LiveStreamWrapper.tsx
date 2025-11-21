// src/components/creator/LiveStreamWrapper.tsx
import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { userService, UserProfile } from '../../services/userService';
import LiveStreamView from './LiveStreamView';
import { Loader2Icon, RadioIcon, ArrowLeftIcon } from 'lucide-react';
import { tierService, Tier } from '../../services/tierService';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function LiveStreamWrapper() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStreamData = async () => {
      setIsLoading(true);
      setCreatorTiers([]);

      try {
        let targetUsername: string | undefined = username;

        // Szenario: Creator klickt auf "Live Gehen" (kein :username in URL)
        if (!targetUsername && currentUser?.username) {
          targetUsername = currentUser.username;
        }

        if (!targetUsername) {
          throw new Error('Creator nicht gefunden.');
        }

        // Lade Profil
        const profileData = await userService.getUserByUsername(targetUsername);
        if (!profileData) {
          throw new Error('Creator nicht gefunden.');
        }

        setCreator(profileData);

        // Lade Tiers (wird für Sperrbildschirm benötigt)
        const tiersData = await tierService.getCreatorTiers(profileData.id);
        setCreatorTiers(tiersData.sort((a, b) => a.price - b.price));

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
    return <Navigate to="/discover" replace />;
  }

  // Bestimmen, ob der eingeloggte Benutzer der Streamer ist
  const isStreamer = currentUser?.id === creator.id;

  // --- NEU: OFFLINE CHECK ---
  // Wenn der Creator NICHT live ist und der Benutzer NICHT der Streamer ist
  if (!creator.is_live && !isStreamer) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-background text-foreground p-4 space-y-6">
        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-neutral grayscale">
            <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
            <AvatarFallback className="text-4xl">{creator.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-neutral rounded-full p-2 border-4 border-background">
            <RadioIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif">{creator.displayName} ist nicht live</h1>
          <p className="text-muted-foreground">
            Dieser Creator streamt momentan nicht. Schau später wieder vorbei oder besuche das Profil.
          </p>
        </div>

        <Button
          onClick={() => navigate(`/profile/${creator.username}`)}
          variant="outline"
          className="bg-transparent border-secondary text-secondary hover:bg-secondary/10"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Zum Profil
        </Button>
      </div>
    );
  }
  // --- ENDE OFFLINE CHECK ---

  return (
    <LiveStreamView
      isStreamer={isStreamer}
      creator={creator}
      creatorTiers={creatorTiers}
    />
  );
}