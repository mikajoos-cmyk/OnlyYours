// src/components/fan/SearchPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
// --- RadioIcon hinzugefügt ---
import { SearchIcon, SlidersHorizontalIcon, CheckIcon, VideoIcon, LockIcon, HeartIcon, MessageCircleIcon, RadioIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { userService, UserProfile } from '../../services/userService';
import { postService, Post as ServicePostData } from '../../services/postService';
import { tierService, Tier } from '../../services/tierService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import ProfilePostViewer, { PostData as ViewerPostData } from './ProfilePostViewer';
import { Switch } from '../ui/switch';
import { subscriptionService } from '../../services/subscriptionService';
import { useToast } from '../../hooks/use-toast';
import SubscriptionModal from './SubscriptionModal';
import { cn } from '../../lib/utils';

// Interne Typdefinition für das Post-Grid
interface GridPost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  hasAccess: boolean;
  creatorUsername: string;
  creatorName: string;
  creatorAvatar: string;
  likes: number;
  comments: number;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('creators'); // 'creators' or 'posts'

  // Filter (gelten jetzt für Posts)
  const [priceFilter, setPriceFilter] = useState('all');
  const [contentType, setContentType] = useState('all');
  const [subscribedOnly, setSubscribedOnly] = useState(false);

  // Ergebnisse
  const [creatorResults, setCreatorResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<ServicePostData[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const { user: currentUser } = useAuthStore();
  const { checkAccess, isLoading: isLoadingSubs, loadSubscriptions } = useSubscriptionStore();
  const [subscriptionMap, setSubscriptionMap] = useState<Map<string, 'ACTIVE' | 'CANCELED'>>(new Map());

  // States für Modals
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<UserProfile | null>(null);
  const [creatorTiersForModal, setCreatorTiersForModal] = useState<Tier[]>([]);

  // States für den Post-Viewer
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  const popularTags = ['#fitness', '#tutorial', '#live', '#art', '#gaming'];

  // Effekt zum Laden der Abonnements
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!currentUser?.id) return;
      try {
        await loadSubscriptions();

        const subs = await subscriptionService.getUserSubscriptions();
        const subMap = new Map<string, 'ACTIVE' | 'CANCELED'>();
        for (const sub of subs) {
          subMap.set(sub.creatorId, sub.status);
        }
        setSubscriptionMap(subMap);
      } catch (err) {
        console.error("Fehler beim Laden der Abonnements:", err);
      }
    };
    fetchSubscriptions();
  }, [currentUser?.id, loadSubscriptions]);

  // Effekt zum Suchen
  useEffect(() => {
    const fetchSearchData = async () => {
      if (!searchQuery) {
        setLoading(false);
        setCreatorResults([]);
        setPostResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (activeTab === 'creators') {
          // --- KORREKTUR: Spezielle Logik für "live" ---
          if (searchQuery.toLowerCase().trim() === 'live') {
            const liveCreators = await userService.getLiveCreators();
            setCreatorResults(liveCreators || []);
          } else {
            // Normale Textsuche
            const creatorData = await userService.searchCreators(searchQuery);
            setCreatorResults(creatorData || []);
          }
          setPostResults([]); // Post-Ergebnisse leeren
          // --- ENDE KORREKTUR ---

        } else if (activeTab === 'posts') {
          // --- POST-SUCHE (unverändert) ---
          const postData = await postService.searchPosts(searchQuery, 30, {
            price: priceFilter,
            type: contentType,
            subscribedOnly: subscribedOnly
          });
          setPostResults(postData || []);
          setCreatorResults([]);
        }
      } catch (err) {
        setError('Fehler bei der Suche.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const handler = setTimeout(() => {
      fetchSearchData();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, activeTab, priceFilter, contentType, subscribedOnly]);

  // Handler für Abo-Modal
  const handleSubscribeClick = (creator: UserProfile) => {
    if (!currentUser) {
      toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein, um zu abonnieren.", variant: "destructive" });
      return;
    }
    setSelectedCreator(creator);
    setLoading(true);

    tierService.getCreatorTiers(creator.id)
      .then(tiers => {
        setCreatorTiersForModal(tiers.sort((a, b) => a.price - b.price));
        setShowSubscriptionModal(true);
      })
      .catch(err => {
        console.error("Fehler beim Laden der Tiers für das Modal:", err);
        toast({ title: "Fehler", description: "Abo-Optionen konnten nicht geladen werden.", variant: "destructive"});
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleManageSubscriptionClick = () => {
    navigate('/profile');
    toast({ title: "Abonnement", description: "Verwalte deine Abonnements in deinem Profil." });
  };

  const handleSubscriptionComplete = (subscribedCreatorId: string) => {
    setSubscriptionMap(prev => new Map(prev).set(subscribedCreatorId, 'ACTIVE'));
    setShowSubscriptionModal(false);
    setCreatorTiersForModal([]);
  };

  // Klick auf einen Tag-Button
  const handleTagClick = (tag: string) => {
    const cleanTag = tag.replace('#', '');
    setSearchQuery(cleanTag);
    // --- KORREKTUR: Bei Klick auf #live zu Creators wechseln ---
    if (cleanTag === 'live') {
      setActiveTab('creators');
    } else {
      setActiveTab('posts');
    }
    // --- ENDE KORREKTUR ---
  };

  // Handler für Post-Klick (öffnet Viewer)
  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
  };

  // Post Grid (für Post-Suchergebnisse)
  const gridPosts: GridPost[] = postResults.map((post) => {
    const hasAccess = checkAccess(post, currentUser?.id);
    return {
      id: post.id,
      thumbnailUrl: post.thumbnail_url || post.mediaUrl,
      type: post.mediaType.toLowerCase() as 'image' | 'video',
      hasAccess: hasAccess,
      creatorUsername: post.creator.username || post.creator.id,
      creatorName: post.creator.name,
      creatorAvatar: post.creator.avatar,
      likes: post.likes,
      comments: post.comments,
    };
  });

  // Daten für den Viewer vorbereiten
  const viewerPosts: ViewerPostData[] = useMemo(() =>
    postResults.map(post => ({
      ...post,
      media: post.mediaUrl,
      creator: {
        name: post.creator.name,
        username: post.creator.username || post.creator.id,
        avatar: post.creator.avatar,
        isVerified: post.creator.isVerified,
      },
  })), [postResults]);

  return (
    <>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-3xl font-serif text-foreground">Suchen</h1>

          {/* Suchleiste */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder={activeTab === 'creators' ? 'Suche nach Creators (tippe "live")...' : 'Suche nach Posts (Hashtags, Titel)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card text-foreground border-border h-12"
              />
            </div>
          </div>

          {/* Tag-Buttons */}
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Button
                key={tag}
                variant="outline"
                onClick={() => handleTagClick(tag)}
                className="bg-card text-foreground border-border hover:bg-secondary hover:text-secondary-foreground rounded-full font-normal"
              >
                {tag}
              </Button>
            ))}
          </div>

          {/* --- TABS FÜR ERGEBNISSE --- */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList className="bg-card border border-border w-full md:w-auto">
                <TabsTrigger value="creators" className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Creators
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex-1 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  Posts
                </TabsTrigger>
              </TabsList>

              {/* Filter-Button (nur im "Posts"-Tab sichtbar) */}
              {activeTab === 'posts' && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-card text-foreground border-border hover:bg-neutral h-10 px-6 font-normal w-full md:w-auto"
                    >
                      <SlidersHorizontalIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Filter
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="bg-card text-foreground border-border">
                    <SheetHeader>
                      <SheetTitle className="text-foreground">Post-Filter</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div className="space-y-2">
                        <Label className="text-foreground">Preis</Label>
                        <Select value={priceFilter} onValueChange={setPriceFilter}>
                          <SelectTrigger className="bg-background text-foreground border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-foreground border-border">
                            <SelectItem value="all">Alle Preise</SelectItem>
                            <SelectItem value="free">Kostenlos (Öffentlich)</SelectItem>
                            <SelectItem value="low">Unter 10€</SelectItem>
                            <SelectItem value="medium">10€ - 30€</SelectItem>
                            <SelectItem value="high">Über 30€</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Art</Label>
                        <Select value={contentType} onValueChange={setContentType}>
                          <SelectTrigger className="bg-background text-foreground border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-foreground border-border">
                            <SelectItem value="all">Alle (Video, Foto)</SelectItem>
                            <SelectItem value="video">Nur Video</SelectItem>
                            <SelectItem value="photo">Nur Foto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 border-t border-border pt-6">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="subscribed-only" className="text-foreground">
                            Nur von abonnierten Creators
                          </Label>
                          <Switch
                            id="subscribed-only"
                            checked={subscribedOnly}
                            onCheckedChange={setSubscribedOnly}
                            disabled={!currentUser}
                          />
                        </div>
                        {!currentUser && <p className="text-xs text-muted-foreground">Melde dich an, um diesen Filter zu nutzen.</p>}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>

            {/* Lade-/Fehler-Zustand */}
            {loading && <p className="text-center text-muted-foreground py-8">Suche läuft...</p>}
            {error && <p className="text-destructive text-center py-8">{error}</p>}

            {/* Creator-Ergebnisse */}
            <TabsContent value="creators" className="mt-6">
              {!loading && !error && creatorResults.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  {searchQuery ? 'Keine Creators für diese Suche gefunden.' : 'Gib einen Suchbegriff ein.'}
                </p>
              )}

              {!loading && !error && creatorResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {creatorResults.map((creator) => {
                    const subscriptionStatus = subscriptionMap.get(creator.id);
                    const isOwnProfile = currentUser?.id === creator.id;

                    return (
                      <Card key={creator.id} className="bg-card border-border overflow-hidden">
                        <div
                          className="relative h-48 bg-neutral cursor-pointer"
                          onClick={() => navigate(`/profile/${creator.username}`)}
                        >
                          {creator.bannerUrl ? (
                            <img src={creator.bannerUrl} alt={creator.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full object-cover bg-neutral" />
                          )}

                          {/* --- KORREKTUR: "LIVE" BADGE HINZUGEFÜGT --- */}
                          {creator.is_live && (
                            <div
                              className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold animate-pulse"
                              // Stoppt Klick-Propagierung, damit Klick auf LIVE zum Stream führt
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/live/${creator.username}`);
                              }}
                            >
                              <RadioIcon className="w-3 h-3" />
                              LIVE
                            </div>
                          )}
                          {/* --- ENDE KORREKTUR --- */}

                        </div>

                        <CardContent className="p-4 flex items-center justify-between">
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate(`/profile/${creator.username}`)}
                          >
                            <Avatar className="w-12 h-12 border-2 border-secondary">
                              <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
                              <AvatarFallback className="bg-secondary text-secondary-foreground">
                                {creator.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-foreground">{creator.displayName}</h3>
                            </div>
                          </div>

                          {!isOwnProfile && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (subscriptionStatus === 'ACTIVE') {
                                  handleManageSubscriptionClick();
                                } else {
                                  handleSubscribeClick(creator);
                                }
                              }}
                              disabled={isLoadingSubs || loading}
                              className={cn(
                                "font-normal transition-colors duration-200 flex-shrink-0",
                                subscriptionStatus === 'ACTIVE' && "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 px-3",
                                subscriptionStatus === 'CANCELED' && "bg-transparent border-2 border-border text-muted-foreground hover:bg-neutral px-3",
                                !subscriptionStatus && "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                              )}
                            >
                              {isLoadingSubs || loading ? '...' : (
                                subscriptionStatus === 'ACTIVE' ? (
                                  <><CheckIcon className="w-4 h-4 mr-1" strokeWidth={2} /> Abonniert</>
                                ) : subscriptionStatus === 'CANCELED' ? (
                                  <><CheckIcon className="w-4 h-4 mr-1" strokeWidth={2} /> Gekündigt</>
                                ) : (
                                  'Abonnieren'
                                )
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Post-Ergebnisse (unverändert) */}
            <TabsContent value="posts" className="mt-6">
              {!loading && !error && postResults.length === 0 && (
                 <p className="text-muted-foreground text-center py-8">
                  {searchQuery ? 'Keine Posts für diese Suche gefunden.' : 'Gib einen Suchbegriff ein.'}
                </p>
              )}

              {!loading && !error && postResults.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {gridPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group bg-card shadow-md"
                      onClick={() => handlePostClick(index)}
                    >
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105",
                            !post.hasAccess && "filter blur-2xl"
                        )}
                      />
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

                      <div
                        className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.creatorUsername}`);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 border-2 border-secondary">
                            <AvatarImage src={post.creatorAvatar} alt={post.creatorName} />
                            <AvatarFallback className="text-xs">{post.creatorName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground font-medium truncate group-hover:underline">
                            {post.creatorName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Subscription Modal (unverändert) */}
      {showSubscriptionModal && selectedCreator && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creator={{
            id: selectedCreator.id,
            name: selectedCreator.displayName,
          }}
          tiers={creatorTiersForModal}
          onSubscriptionComplete={() => handleSubscriptionComplete(selectedCreator.id)}
        />
      )}

      {/* Post Feed Viewer Modal (unverändert) */}
      {isViewerOpen && (
        <ProfilePostViewer
          initialPosts={viewerPosts}
          initialIndex={selectedPostIndex}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
}