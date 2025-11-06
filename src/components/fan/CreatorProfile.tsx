// src/components/fan/CreatorProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UsersIcon, GridIcon, VideoIcon, CheckIcon, LockIcon } from 'lucide-react'; // LockIcon hinzugefügt
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SubscriptionModal from './SubscriptionModal';
// WICHTIG: Importiere den aktualisierten ProfilePostViewer
import ProfilePostViewer from './ProfilePostViewer';
import type { PostData as ViewerPostData } from './ProfilePostViewer'; // Typimport
import { userService, UserProfile } from '../../services/userService';
import { postService, Post as ServicePostData } from '../../services/postService';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
// --- NEUE IMPORTS ---
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal'; // PPV Modal für das Grid
// --- ENDE ---


// Interne Typdefinition für die Grid-Ansicht (jetzt mit Zugriffs-Info)
interface GridPost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption: string;
  likes: number;
  comments: number;
  hasAccess: boolean; // <-- NEU
  price: number; // <-- NEU
}

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  // --- NEUER STORE ---
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs } = useSubscriptionStore();
  // --- ENDE ---

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  // isLoadingSubscription wird durch isLoadingSubs aus dem Store ersetzt
  // const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostFeed, setShowPostFeed] = useState(false);

  // --- NEU: PPV Modal State ---
  const [showPpvModal, setShowPpvModal] = useState(false);
  const [selectedPostForPpv, setSelectedPostForPpv] = useState<ServicePostData | null>(null);
  // --- ENDE ---


  // 1. Creator-Profil laden
  useEffect(() => {
    const fetchCreator = async () => {
      if (!username) {
          setError('Kein Benutzername in der URL gefunden.');
          setIsLoadingProfile(false);
          return;
      };
      setIsLoadingProfile(true);
      setError(null);
      setCreator(null);
      setPosts([]);
      setIsSubscribed(false);
      // setIsLoadingSubscription(true); // Ersetzt durch isLoadingSubs

      try {
        const profile = await userService.getUserByUsername(username);
        if (!profile) {
          setError('Benutzer nicht gefunden.');
        } else {
            setCreator(profile);
        }
      } catch (err: any) {
        console.error("Fehler beim Laden des Profils:", err);
        setError('Profil konnte nicht geladen werden.');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchCreator();
  }, [username]);

  // 2. Posts laden
  useEffect(() => {
    const fetchPosts = async () => {
      if (!creator || !creator.id) return;
      setIsLoadingPosts(true);
      try {
        const fetchedPosts = await postService.getCreatorPosts(creator.id);
        setPosts(fetchedPosts);
      } catch (err: any) {
        console.error("Fehler beim Laden der Posts:", err);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [creator]);

  // 3. Abonnement-Status prüfen (über den Store)
  useEffect(() => {
    if (!isLoadingProfile && !isLoadingSubs && creator && currentUser) {
      const sub = useSubscriptionStore.getState().subscriptionMap.get(creator.id);
      const isActive = sub && (sub.status === 'ACTIVE' || (sub.status === 'CANCELED' && sub.endDate && new Date(sub.endDate) > new Date()));
      setIsSubscribed(!!isActive);
    }
    if (!currentUser || creator?.id === currentUser?.id) {
        setIsSubscribed(false);
    }
  }, [creator, currentUser, isLoadingProfile, isLoadingSubs]);


  if (isLoadingProfile || isLoadingSubs) { // Ladeanzeige, während Profil ODER Abos laden
    return <div className="flex justify-center items-center h-screen"><p className="text-foreground">Lade Profil...</p></div>;
  }
  if (error && !creator) {
    return <div className="flex justify-center items-center h-screen"><p className="text-destructive">{error}</p></div>;
  }
  if (!creator) {
    return <div className="flex justify-center items-center h-screen"><p className="text-muted-foreground">Benutzer konnte nicht geladen werden.</p></div>;
  }

  // --- AKTUALISIERTE HANDLER ---
  const handlePostClick = (index: number, hasAccess: boolean) => {
    setSelectedPostIndex(index);
    if (hasAccess) {
      setShowPostFeed(true); // Zugriff -> Öffne Viewer
    } else {
      // Kein Zugriff -> Öffne PPV-Modal
      setSelectedPostForPpv(posts[index]);
      setShowPpvModal(true);
    }
  };
  const handleClosePostFeed = () => {
    setShowPostFeed(false);
  };
  const handleSubscribeClick = () => {
    if (!currentUser) {
        toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein, um zu abonnieren.", variant: "destructive" });
        return;
    }
    setShowSubscriptionModal(true);
  };
  const handleManageSubscriptionClick = () => {
    navigate('/profile');
    toast({ title: "Abonnement", description: "Verwalte deine Abonnements in deinem Profil." });
  };

  const handleSubscriptionComplete = (subscribedCreatorId: string) => {
    setIsSubscribed(true); // UI sofort aktualisieren
    setShowSubscriptionModal(false);
    // Store neu laden (wird automatisch beim nächsten Check Access berücksichtigt)
    useSubscriptionStore.getState().loadSubscriptions();
    // Posts neu laden, da sich der Zugriff geändert hat (optional, aber gut für RLS)
    if (creator) postService.getCreatorPosts(creator.id).then(setPosts);
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId); // UI optimistisch aktualisieren
    setShowPpvModal(false);