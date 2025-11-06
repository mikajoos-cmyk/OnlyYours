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
    // Öffne den Post-Viewer, nachdem der Kauf erfolgreich war
    setShowPostFeed(true);
  };
  // --- ENDE HANDLER ---

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isOwnProfile = currentUser?.id === creator.id;

  // Posts für das Grid und den Viewer aufbereiten
  // WICHTIG: Wir verwenden checkAccess HIER, um zu bestimmen, ob der Post gesperrt ist
  const gridPosts: GridPost[] = posts.map((post) => {
    // Führe den Zugriffs-Check für jeden Post durch
    const hasAccess = checkAccess(post, currentUser?.id);
    return {
      id: post.id,
      thumbnailUrl: post.thumbnail_url || post.mediaUrl, // Thumbnail oder mediaUrl
      type: post.mediaType.toLowerCase() as 'image' | 'video',
      caption: post.caption,
      likes: post.likes,
      comments: post.comments,
      hasAccess: hasAccess, // <-- Das Ergebnis des Checks
      price: post.price, // <-- Preis für PPV-Logik
    };
  });

  const viewerPosts: ViewerPostData[] = posts.map(post => ({
    id: post.id,
    media: post.mediaUrl,
    caption: post.caption,
    hashtags: post.hashtags,
    likes: post.likes,
    comments: post.comments,
    isLiked: post.isLiked,
    mediaType: post.mediaType,
    price: post.price,
    tier_id: post.tier_id,
    creatorId: post.creatorId,
    creator: {
      name: creator.displayName,
      username: creator.username,
      avatar: creator.avatarUrl || '',
      isVerified: creator.isVerified,
    },
    // Wichtige Felder für checkAccess (obwohl schon in gridPosts geprüft)
    thumbnail_url: post.thumbnail_url,
    mediaUrl: post.mediaUrl,
    is_published: post.is_published,
    scheduled_for: post.scheduled_for,
    created_at: post.created_at,
  }));


  return (
    <>
      <div className="min-h-screen">
        {/* Banner */}
        <div
          className="h-48 md:h-64 bg-neutral relative"
        >
          {creator.bannerUrl && (
            <img src={creator.bannerUrl} alt={creator.displayName} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profil-Header */}
        <div className="max-w-4xl mx-auto px-4 -mt-16">
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Avatar className="w-32 h-32 border-4 border-background">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-4xl">
                  {creator.displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left pt-4">
                <h1 className="text-3xl font-serif text-foreground">{creator.displayName}</h1>
                <p className="text-muted-foreground">@{creator.username}</p>
              </div>
            </div>

            {/* Abo-Button */}
            {!isOwnProfile && (
              <Button
                onClick={() => isSubscribed ? handleManageSubscriptionClick() : handleSubscribeClick()}
                disabled={isLoadingSubs}
                className={cn(
                  "mt-4 md:mt-0 font-normal transition-colors duration-200 min-w-[150px] text-base py-5",
                  isSubscribed
                    ? "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                )}
              >
                {isLoadingSubs ? '...' : (
                  isSubscribed ? (
                    <>
                      <CheckIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                      Abonniert
                    </>
                  ) : (
                    `Abonnieren für ${formatCurrency(creator.subscriptionPrice)}`
                  )
                )}
              </Button>
            )}
            {isOwnProfile && (
                 <Button
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    className="mt-4 md:mt-0 font-normal text-base py-5 bg-card text-foreground border-border hover:bg-neutral"
                >
                    Profil bearbeiten
                </Button>
            )}
          </div>

          {/* Bio & Stats */}
          <div className="mt-8 space-y-4">
            <p className="text-foreground text-center md:text-left max-w-2xl">{creator.bio}</p>
            <div className="flex items-center justify-center md:justify-start gap-6 text-foreground">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{creator.followersCount}</span>
                <span className="text-muted-foreground">Abonnenten</span>
              </div>
              <div className="flex items-center gap-1">
                <GridIcon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{posts.length}</span>
                <span className="text-muted-foreground">Beiträge</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="w-full mt-8">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="posts" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Beiträge</TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Medien</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-6">
              {isLoadingPosts && <p className="text-muted-foreground">Lade Beiträge...</p>}
              {!isLoadingPosts && gridPosts.length === 0 && (
                <p className="text-muted-foreground text-center py-12">Dieser Creator hat noch nichts gepostet.</p>
              )}
              {!isLoadingPosts && gridPosts.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {gridPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-neutral"
                      onClick={() => handlePostClick(index, post.hasAccess)}
                    >
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className={cn(
                            "w-full h-full object-cover transition-transform group-hover:scale-105",
                            !post.hasAccess && "filter blur-lg" // <-- VERPIXELUNG
                        )}
                      />
                      {post.type === 'video' && (
                        <VideoIcon className="absolute top-2 right-2 w-5 h-5 text-white drop-shadow-lg" strokeWidth={2} />
                      )}

                      {/* --- SPERR-OVERLAY --- */}
                      {!post.hasAccess && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <LockIcon className="w-8 h-8 text-foreground" />
                        </div>
                      )}

                      {/* Hover-Overlay (nur wenn Zugriff besteht) */}
                      {post.hasAccess && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1 text-foreground">
                            <HeartIcon className="w-5 h-5" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center gap-1 text-foreground">
                            <MessageCircleIcon className="w-5 h-5" />
                            <span>{post.comments}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="media" className="mt-6">
                 <p className="text-muted-foreground text-center py-12">Medien-Tab (nicht implementiert).</p>
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creator={{
            id: creator.id,
            name: creator.displayName,
            subscriptionPrice: creator.subscriptionPrice,
          }}
          onSubscriptionComplete={() => handleSubscriptionComplete(creator.id)}
        />
      )}

      {/* Post Feed Viewer Modal */}
      {showPostFeed && (
        <ProfilePostViewer
          initialPosts={viewerPosts}
          initialIndex={selectedPostIndex}
          onClose={handleClosePostFeed}
        />
      )}

      {/* PPV Modal */}
      {showPpvModal && selectedPostForPpv && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={selectedPostForPpv}
            onPaymentSuccess={handlePurchaseSuccess}
         />
      )}
    </>
  );
}