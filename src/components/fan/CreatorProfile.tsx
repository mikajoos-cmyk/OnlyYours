// src/components/fan/CreatorProfile.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UsersIcon, GridIcon, VideoIcon, CheckIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SubscriptionModal from './SubscriptionModal';
import ProfilePostViewer, { PostData as ViewerPostData } from './ProfilePostViewer';
import { userService, UserProfile } from '../../services/userService';
import { postService, Post as ServicePostData } from '../../services/postService';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

// Interne Typdefinition für die Grid-Ansicht
interface GridPost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption: string;
  likes: number;
  comments: number;
}

export default function CreatorProfile() {
  // --- HIER IST DIE ÄNDERUNG ---
  // Holt den ':username' Parameter aus der URL (z.B. /profile/creator-name)
  const { username } = useParams<{ username: string }>();
  // --- ENDE DER ÄNDERUNG ---

  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostFeed, setShowPostFeed] = useState(false);

  // 1. Creator-Profil laden (Verwendet jetzt getUserByUsername)
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
      setIsLoadingSubscription(true);

      try {
        // --- HIER IST DIE ÄNDERUNG ---
        // Ruft das Profil basierend auf dem 'username' aus der URL ab
        const profile = await userService.getUserByUsername(username);
        // --- ENDE DER ÄNDERUNG ---

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
  }, [username]); // Neu laden, wenn sich der 'username' in der URL ändert

  // 2. Posts laden, NACHDEM das Creator-Profil geladen wurde
  useEffect(() => {
    const fetchPosts = async () => {
      if (!creator || !creator.id) return;
      setIsLoadingPosts(true);
      try {
        // Ruft die Posts über die ID des gefundenen Creators ab
        const fetchedPosts = await postService.getCreatorPosts(creator.id);
        setPosts(fetchedPosts);
      } catch (err: any) {
        console.error("Fehler beim Laden der Posts:", err);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [creator]); // Abhängig vom geladenen Creator-Objekt

  // 3. Abonnement-Status prüfen
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!creator || !currentUser || creator.id === currentUser.id) {
          setIsLoadingSubscription(false);
          setIsSubscribed(false);
          return;
      }
      setIsLoadingSubscription(true);
      try {
        const activeSubscription = await subscriptionService.getActiveSubscription(currentUser.id, creator.id);
        setIsSubscribed(!!activeSubscription);
      } catch (error) {
        console.error("Fehler beim Prüfen des Abonnements:", error);
        setIsSubscribed(false);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    if (!isLoadingProfile && creator) {
        checkSubscriptionStatus();
    }
  }, [creator, currentUser, isLoadingProfile]);

  // --- Rendern ---
  if (isLoadingProfile) {
    return <div className="flex justify-center items-center h-screen"><p className="text-foreground">Lade Profil...</p></div>;
  }
  if (error && !creator) {
    return <div className="flex justify-center items-center h-screen"><p className="text-destructive">{error}</p></div>;
  }
  if (!creator) {
    return <div className="flex justify-center items-center h-screen"><p className="text-muted-foreground">Benutzer konnte nicht geladen werden.</p></div>;
  }

  // --- Event Handlers ---
  const handlePostClick = (index: number) => {
    if (index >= 0 && index < posts.length) {
        setSelectedPostIndex(index);
        setShowPostFeed(true);
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

  // --- Daten für die Ansicht transformieren ---
  const gridPosts: GridPost[] = posts.map(p => ({
      id: p.id,
      thumbnailUrl: p.thumbnail_url || p.mediaUrl,
      type: p.mediaType,
      caption: p.caption,
      likes: p.likes,
      comments: p.comments,
  }));
  const formattedPostsForViewer: ViewerPostData[] = posts.map(p => ({
    id: p.id,
    media: p.mediaUrl,
    caption: p.caption,
    hashtags: p.hashtags,
    likes: p.likes,
    comments: p.comments,
    isLiked: p.isLiked,
    mediaType: p.mediaType,
    creator: {
      name: creator.displayName,
      avatar: creator.avatarUrl || 'https://placehold.co/100x100',
      username: creator.username,
      isVerified: creator.isVerified,
    }
  }));
  const filterGridPosts = (type?: 'image' | 'video'): GridPost[] => {
    if (!type) return gridPosts;
    return gridPosts.filter(post => post.type === type);
  };

  // --- JSX (bleibt gleich, außer Hinzufügung von @username) ---
  return (
    <>
      <div className={`min-h-screen ${showPostFeed ? 'hidden' : ''} pb-16 md:pb-0`}>
         <div className="relative h-64 md:h-80 bg-neutral">
          {creator.bannerUrl && ( <img src={creator.bannerUrl} alt="Banner" className="w-full h-full object-cover" loading="lazy"/> )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
        <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-32 h-32 border-4 border-secondary">
              <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-3xl">
                {creator.displayName?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
             <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-serif text-foreground">{creator.displayName}</h1>
                {creator.isVerified && ( <Badge className="bg-secondary text-secondary-foreground font-normal">Verifiziert</Badge> )}
              </div>
              {/* (AKTUALISIERT) @username hinzugefügt */}
              <p className="text-lg text-secondary">@{creator.username}</p>

              <p className="text-muted-foreground max-w-md">{creator.bio || 'Keine Bio vorhanden.'}</p>
              <div className="flex items-center justify-center gap-2 text-foreground">
                <UsersIcon className="w-5 h-5" strokeWidth={1.5} />
                <span>{creator.followersCount.toLocaleString()} Abonnenten</span>
              </div>
            </div>

            {currentUser && currentUser.id !== creator.id && (
                 <Button
                    onClick={isSubscribed ? handleManageSubscriptionClick : handleSubscribeClick}
                    disabled={isLoadingSubscription}
                    className={cn(
                        "px-8 py-6 text-base font-normal w-64 transition-colors duration-200",
                        isSubscribed
                         ? "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10"
                         : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    )}
                 >
                    {isLoadingSubscription ? (
                        'Laden...'
                    ) : isSubscribed ? (
                        <>
                            <CheckIcon className="w-5 h-5 mr-2" strokeWidth={2} />
                            Abonniert
                        </>
                    ) : (
                        `Abonnieren für ${creator.subscriptionPrice.toFixed(2)}€/Monat`
                    )}
                 </Button>
            )}
          </div>

          <div className="mt-16 mb-8">
             <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-card border border-border w-full justify-start">
                 <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><GridIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />Alle ({gridPosts.length})</TabsTrigger>
                <TabsTrigger value="images" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><GridIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />Bilder ({filterGridPosts('image').length})</TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground"><VideoIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />Videos ({filterGridPosts('video').length})</TabsTrigger>
              </TabsList>
              {isLoadingPosts && <p className="text-center mt-6 text-muted-foreground">Lade Posts...</p>}
              {!isLoadingPosts && (
                <>
                  <TabsContent value="all" className="mt-6">
                     {gridPosts.length === 0 ? (<p className="text-center text-muted-foreground">Noch keine Posts vorhanden.</p>) : (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {gridPosts.map((post, index) => (<div key={post.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group bg-neutral" onClick={() => handlePostClick(index)}>
                              <img src={post.thumbnailUrl} alt={post.caption || 'Post thumbnail'} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                               {post.type === 'video' && (<div className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"><VideoIcon className="w-4 h-4 text-foreground drop-shadow-lg" strokeWidth={2} /></div>)}
                               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-foreground text-sm">
                                   <span>♡ {post.likes}</span>
                                   <span>💬 {post.comments}</span>
                               </div></div>
                          ))}</div>
                     )}
                  </TabsContent>
                   <TabsContent value="images" className="mt-6">
                     {filterGridPosts('image').length === 0 ? ( <p className="text-center text-muted-foreground">Keine Bilder vorhanden.</p> ) : (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {filterGridPosts('image').map((post) => (<div key={post.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group bg-neutral" onClick={() => handlePostClick(posts.findIndex(p => p.id === post.id))}>
                                 <img src={post.thumbnailUrl} alt={post.caption || 'Post thumbnail'} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-foreground text-sm">
                                      <span>♡ {post.likes}</span>
                                      <span>💬 {post.comments}</span>
                                  </div></div>
                          ))}</div>
                     )}
                  </TabsContent>
                   <TabsContent value="videos" className="mt-6">
                     {filterGridPosts('video').length === 0 ? ( <p className="text-center text-muted-foreground">Keine Videos vorhanden.</p> ) : (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {filterGridPosts('video').map((post) => (<div key={post.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group bg-neutral" onClick={() => handlePostClick(posts.findIndex(p => p.id === post.id))}>
                                 <img src={post.thumbnailUrl} alt={post.caption || 'Post thumbnail'} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                                  <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"><VideoIcon className="w-4 h-4 text-foreground drop-shadow-lg" strokeWidth={2} /></div>
                                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-foreground text-sm">
                                      <span>♡ {post.likes}</span>
                                      <span>💬 {post.comments}</span>
                                  </div></div>
                          ))}</div>
                     )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>

       <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} creator={{ name: creator.displayName, subscriptionPrice: creator.subscriptionPrice }}/>

      {showPostFeed && formattedPostsForViewer.length > 0 && (
        <ProfilePostViewer
            initialPosts={formattedPostsForViewer}
            initialIndex={selectedPostIndex}
            onClose={handleClosePostFeed}
        />
      )}
    </>
  );
}