// src/components/fan/CreatorProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UsersIcon, GridIcon, VideoIcon, CheckIcon, LockIcon, MessageCircleIcon, HeartIcon, LayoutGrid, Image as ImageIcon, Film as FilmIcon } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import ProfilePostViewer from './ProfilePostViewer';
import type { PostData as ViewerPostData } from './ProfilePostViewer';
import { userService, UserProfile } from '../../services/userService';
import { postService, Post as ServicePostData } from '../../services/postService';
import { tierService, Tier } from '../../services/tierService';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';

// Interne Typdefinition für die Grid-Ansicht
interface GridPost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption: string | null;
  likes: number;
  comments: number;
  hasAccess: boolean;
  price: number;
}

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs } = useSubscriptionStore();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subscriptionStatus, setSubscriptionStatus] = useState<'ACTIVE' | 'CANCELED' | null>(null);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostFeed, setShowPostFeed] = useState(false);

  const [showPpvModal, setShowPpvModal] = useState(false);
  const [selectedPostForPpv, setSelectedPostForPpv] = useState<ServicePostData | null>(null);

  // --- NEU: Geteilte Filter-States ---
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all'); // 'all' oder tier-uuid
  // --- ENDE ---

  // 1. Creator-Profil UND Tiers laden
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!username) {
        setError('Kein Benutzername in der URL gefunden.');
        setIsLoadingProfile(false);
        return;
      }
      setIsLoadingProfile(true);
      setError(null);
      setCreator(null);
      setPosts([]);
      setCreatorTiers([]);
      setSubscriptionStatus(null);
      // Filter zurücksetzen
      setMediaTypeFilter('all');
      setTierFilter('all');

      try {
        const profile = await userService.getUserByUsername(username);
        if (!profile) {
          setError('Benutzer nicht gefunden.');
          setIsLoadingProfile(false);
          return;
        }
        setCreator(profile);

        // Tiers sortiert nach Preis laden
        const tiers = await tierService.getCreatorTiers(profile.id);
        setCreatorTiers(tiers.sort((a, b) => a.price - b.price) || []);

        setIsLoadingPosts(true);
        const fetchedPosts = await postService.getCreatorPosts(profile.id);
        setPosts(fetchedPosts);

      } catch (err: any) {
        console.error("Fehler beim Laden des Profils oder der Tiers:", err);
        setError('Profil konnte nicht geladen werden.');
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingPosts(false);
      }
    };
    fetchCreatorData();
  }, [username]);

  // 2. Abonnement-Status prüfen
  useEffect(() => {
    if (!isLoadingProfile && !isLoadingSubs && creator && currentUser) {
      const subMap = useSubscriptionStore.getState().subscriptionMap;
      const activeSub = Array.from(subMap.values()).find(s => {
          if (s.creatorId !== creator.id) return false;
          const isStillValid = s.endDate && new Date(s.endDate) > new Date();
          if (s.status === 'ACTIVE') return true;
          if (s.status === 'CANCELED' && isStillValid) return true;
          return false;
      });

      if (!activeSub) {
        setSubscriptionStatus(null);
        return;
      }

      const allActiveSubs = Array.from(subMap.values()).filter(s => s.creatorId === creator.id && (s.status === 'ACTIVE' || (s.status === 'CANCELED' && s.endDate && new Date(s.endDate) > new Date())));
      const isAnyActive = allActiveSubs.some(s => s.status === 'ACTIVE');
      setSubscriptionStatus(isAnyActive ? 'ACTIVE' : 'CANCELED');

    } else if (!currentUser || creator?.id === creator?.id) {
        setSubscriptionStatus(null);
    }
  }, [creator, currentUser, isLoadingProfile, isLoadingSubs, useSubscriptionStore.getState().subscriptionMap]);


  if (isLoadingProfile) {
    return <div className="flex justify-center items-center h-screen bg-background"><p className="text-muted-foreground">Lade Profil...</p></div>;
  }
  if (error && !creator) {
    return <div className="flex justify-center items-center h-screen bg-background"><p className="text-destructive">{error}</p></div>;
  }
  if (!creator) {
    return <div className="flex justify-center items-center h-screen bg-background"><p className="text-muted-foreground">Benutzer konnte nicht geladen werden.</p></div>;
  }

  // --- HANDLER ---

  const handleSubscribeClick = () => {
    if (!currentUser) {
      toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein, um zu abonnieren.", variant: "destructive" });
      return;
    }
    setShowPpvModal(false);
    setTimeout(() => {
        setShowSubscriptionModal(true);
    }, 150);
  };

  const handlePostClick = (index: number, hasAccess: boolean) => {
    const postFromGrid = filteredPosts[index];
    if (!postFromGrid) return;

    const originalPost = posts.find(p => p.id === postFromGrid.id);
    if (!originalPost) return;

    if (hasAccess) {
      const originalPostIndex = posts.findIndex(p => p.id === postFromGrid.id);
      if (originalPostIndex > -1) {
        setSelectedPostIndex(originalPostIndex);
        setShowPostFeed(true);
      }
    } else {
      setSelectedPostForPpv(originalPost);
      setShowPpvModal(true);
    }
  };

  const handleClosePostFeed = () => {
    setShowPostFeed(false);
  };

  const handleManageSubscriptionClick = () => {
    navigate('/profile');
    toast({ title: "Abonnement", description: "Verwalte deine Abonnements in deinem Profil." });
  };

  const handleSubscriptionComplete = (subscribedCreatorId: string) => {
    setSubscriptionStatus('ACTIVE');
    setShowSubscriptionModal(false);
    useSubscriptionStore.getState().loadSubscriptions();
    if (creator) postService.getCreatorPosts(creator.id).then(setPosts);
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    setShowPpvModal(false);
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex > -1) {
      setSelectedPostIndex(postIndex);
      setShowPostFeed(true);
    }
    if (creator) postService.getCreatorPosts(creator.id).then(setPosts);
  };

  const isOwnProfile = currentUser?.id === creator.id;

  // --- AKTUALISIERTE FILTER-LOGIK (ZWEISTUFIG) ---
  const filteredPosts = posts.filter(post => {
    // 1. Nach Medientyp filtern
    const mediaMatch =
      mediaTypeFilter === 'all' ||
      (mediaTypeFilter === 'images' && post.mediaType === 'image') ||
      (mediaTypeFilter === 'videos' && post.mediaType === 'video');

    // 2. Nach Tier filtern
    const tierMatch =
      tierFilter === 'all' || // "Alle Stufen"
      post.tier_id === tierFilter; // Spezifische Tier-ID

    return mediaMatch && tierMatch;
  });
  // --- ENDE ---

  const gridPosts: GridPost[] = filteredPosts.map((post) => {
    const hasAccess = checkAccess(post, currentUser?.id);
    return {
      id: post.id,
      thumbnailUrl: post.thumbnail_url || post.mediaUrl,
      type: post.mediaType.toLowerCase() as 'image' | 'video',
      caption: post.caption,
      likes: post.likes,
      comments: post.comments,
      hasAccess: hasAccess,
      price: post.price,
    };
  });

  const viewerPosts: ViewerPostData[] = posts.map(post => ({
    ...post,
    media: post.mediaUrl,
    creator: {
      id: creator.id,
      name: creator.displayName,
      username: creator.username,
      avatar: creator.avatarUrl || '',
      isVerified: creator.isVerified,
    },
  }));

  const renderSubscribeButton = () => {
    if (isOwnProfile) {
      return (
        <Button
          onClick={() => navigate('/profile')}
          className="mt-4 md:mt-0 font-normal text-lg py-6 px-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full"
        >
          Profil bearbeiten
        </Button>
      );
    }

    if (creatorTiers.length === 0 && subscriptionStatus === null && !isLoadingSubs) {
        return (
            <Button
                disabled={true}
                className="mt-4 md:mt-0 font-normal text-lg py-6 px-12 bg-neutral text-muted-foreground rounded-full"
            >
                Keine Abos verfügbar
            </Button>
        );
    }

    const baseButtonClasses = "mt-4 md:mt-0 font-normal transition-colors duration-200 min-w-[200px] text-lg py-6 px-12 rounded-full shadow-lg";

    switch (subscriptionStatus) {
      case 'ACTIVE':
        return (
          <Button
            onClick={handleManageSubscriptionClick}
            disabled={isLoadingSubs}
            className={cn(baseButtonClasses, "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10")}
          >
            <CheckIcon className="w-5 h-5 mr-2" strokeWidth={2} />
            Abonniert
          </Button>
        );
      case 'CANCELED':
        return (
          <Button
            onClick={handleSubscribeClick}
            disabled={isLoadingSubs}
            className={cn(baseButtonClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/90")}
          >
            Gekündigt (Reaktivieren)
          </Button>
        );
      case null:
      default:
        if (creatorTiers.length > 0 || isLoadingSubs) {
           return (
            <Button
              onClick={handleSubscribeClick}
              disabled={isLoadingSubs}
              className={cn(baseButtonClasses, "bg-secondary text-secondary-foreground hover:bg-secondary/90")}
            >
              {creatorTiers.length > 0 ? `Abonnieren ab ${creatorTiers[0]?.price.toFixed(2)}€/Monat` : "Abonnieren"}
            </Button>
          );
        }
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      <div className="relative h-64 md:h-80 bg-neutral">
        {creator.bannerUrl && (
          <img src={creator.bannerUrl} alt={`${creator.displayName} Banner`} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background/90" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 md:-mt-32 relative z-10">

        <div className="flex flex-col items-center justify-center text-center">
          <Avatar className="w-40 h-40 border-4 border-background shadow-lg">
            <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
            <AvatarFallback className="bg-secondary text-secondary-foreground text-5xl">
              {creator.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-4xl font-extrabold font-serif text-foreground mt-4 flex items-center gap-2">
            {creator.displayName}
            {creator.isVerified && <Badge className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">Verifiziert</Badge>}
          </h1>
          <p className="text-lg text-muted-foreground mt-1 font-semibold">{creator.bio}</p>

          <div className="flex items-center gap-2 text-foreground mt-4 text-lg">
            <UsersIcon className="w-5 h-5 text-secondary" />
            <span className="font-bold">{creator.followersCount?.toLocaleString() || '0'}</span>
            <span className="text-muted-foreground">Follower</span>
          </div>

          <div className="mt-8">
            {renderSubscribeButton()}
          </div>
        </div>

        {/* --- NEUES ZWEIZEILIGES FILTER-LAYOUT --- */}

        {/* Zeile 1: Medientyp-Filter */}
        <div className="flex justify-center items-center gap-2 p-2 bg-card rounded-full shadow-lg mt-12 mb-2 border border-border flex-wrap">
          <Button
            onClick={() => setMediaTypeFilter('all')}
            size="sm"
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold",
              mediaTypeFilter === 'all' ? "bg-secondary text-secondary-foreground shadow-md" : "bg-transparent text-muted-foreground hover:bg-neutral"
            )}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Alle
          </Button>
          <Button
            onClick={() => setMediaTypeFilter('images')}
            size="sm"
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold",
              mediaTypeFilter === 'images' ? "bg-secondary text-secondary-foreground shadow-md" : "bg-transparent text-muted-foreground hover:bg-neutral"
            )}
          >
            <ImageIcon className="w-4 h-4 mr-2" /> Bilder
          </Button>
          <Button
            onClick={() => setMediaTypeFilter('videos')}
            size="sm"
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold",
              mediaTypeFilter === 'videos' ? "bg-secondary text-secondary-foreground shadow-md" : "bg-transparent text-muted-foreground hover:bg-neutral"
            )}
          >
            <FilmIcon className="w-4 h-4 mr-2" /> Videos
          </Button>
        </div>

        {/* Zeile 2: Tier-Filter (nur wenn Tiers existieren) */}
        {creatorTiers.length > 0 && (
          <div className="flex justify-center items-center gap-2 p-2 bg-card rounded-full shadow-lg mb-8 border border-border flex-wrap">
            <Button
              onClick={() => setTierFilter('all')}
              size="sm"
              className={cn(
                "px-5 py-2 rounded-full text-sm font-semibold",
                tierFilter === 'all' ? "bg-secondary text-secondary-foreground shadow-md" : "bg-transparent text-muted-foreground hover:bg-neutral"
              )}
            >
              <GridIcon className="w-4 h-4 mr-2" /> Alle Stufen
            </Button>

            {/* Dynamische Tier-Filter */}
            {creatorTiers.map((tier) => (
              <Button
                  key={tier.id}
                  onClick={() => setTierFilter(tier.id)}
                  size="sm"
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-semibold",
                    tierFilter === tier.id ? "bg-secondary text-secondary-foreground shadow-md" : "bg-transparent text-muted-foreground hover:bg-neutral"
                  )}
                >
                  <LockIcon className="w-4 h-4 mr-2" /> {tier.name}
                </Button>
            ))}
          </div>
        )}
        {/* --- ENDE FILTER-LAYOUT --- */}


        {/* Post Grid Section */}
        <div className="mt-6">
          {isLoadingPosts && <p className="text-muted-foreground text-center py-12">Lade Beiträge...</p>}

          {/* Angepasste "Keine Posts" Nachrichten */}
          {!isLoadingPosts && posts.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              Dieser Creator hat noch nichts gepostet.
            </p>
          )}
          {!isLoadingPosts && posts.length > 0 && filteredPosts.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              Keine Beiträge für die ausgewählten Filter gefunden.
            </p>
          )}
          {/* Ende angepasste Nachrichten */}

          {!isLoadingPosts && filteredPosts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {gridPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-card"
                  onClick={() => handlePostClick(index, post.hasAccess)}
                >

                  {/* --- KORREKTUR HIER: Video/Img-Tag --- */}
                  {post.type === 'video' ? (
                    <video
                      src={post.thumbnailUrl} // thumbnailUrl enthält mediaUrl bei Videos
                      muted
                      loop
                      playsInline
                      autoPlay
                      className={cn(
                          "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                          !post.hasAccess && "filter blur-2xl"
                      )}
                    />
                  ) : (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption || ""}
                      className={cn(
                          "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                          !post.hasAccess && "filter blur-2xl"
                      )}
                      loading="lazy"
                    />
                  )}
                  {/* --- ENDE KORREKTUR --- */}


                  {post.type === 'video' && (
                    <VideoIcon className="absolute top-2 right-2 w-5 h-5 text-foreground drop-shadow-lg" strokeWidth={2} />
                  )}

                  {!post.hasAccess && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <LockIcon className="w-8 h-8 text-secondary" />
                    </div>
                  )}

                  {post.hasAccess && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
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
          }}
          tiers={creatorTiers}
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
            creatorTiers={creatorTiers} // Übergibt die Tiers an das Modal
            onSubscribeClick={handleSubscribeClick} // Übergibt die Abo-Funktion
         />
      )}
    </div>
  );
}