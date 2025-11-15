// src/components/creator/LiveStreamWrapper.tsx
import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { userService, UserProfile } from '../../services/userService';
import LiveStreamView from './LiveStreamView';
import { Loader2Icon } from 'lucide-react';
import { tierService, Tier } from '../../services/tierService';

export default function LiveStreamWrapper() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser, isLoading: isLoadingAuth } = useAuthStore();
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStreamData = async () => {
      setIsLoading(true);
      setCreatorTiers([]);

      try {
        let targetUser: UserProfile | null = null;
        let targetUsername: string | undefined = username;

        if (!targetUsername && currentUser?.username) {
          targetUsername = currentUser.username;
        }

        if (!targetUsername) {
          throw new Error('Creator nicht gefunden.');
        }

        const profileData = await userService.getUserByUsername(targetUsername);
        if (!profileData) {
          throw new Error('Creator nicht gefunden.');
        }

        const [tiersData] = await Promise.all([
           tierService.getCreatorTiers(profileData.id)
        ]);

        targetUser = profileData;
        setCreator(targetUser);
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

  const isStreamer = currentUser?.id === creator.id;

  return (
    <LiveStreamView
      isStreamer={isStreamer}
      creator={creator}
      creatorTiers={creatorTiers}
    />
  );
}