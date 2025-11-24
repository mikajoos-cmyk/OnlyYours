// src/components/fan/SubscriberFeed.tsx
import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, LockIcon, UserCheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFeedStore } from '../../stores/feedStore';
import type { Post as ServicePostData } from '../../services/postService';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
import { useToast } from '../../hooks/use-toast';
import TipModal from './TipModal';
import type { Post as PostData } from '../../services/postService';
import { tierService, Tier } from '../../services/tierService';
import SubscriptionModal from './SubscriptionModal';

interface SubscriberFeedProps {
  initialPosts?: PostData[] | ServicePostData[];
  initialIndex?: number;
  isProfileView?: boolean;
  onClose?: () => void;
}

export default function SubscriberFeed({
  initialPosts: initialPostsProp,
  initialIndex = 0,
  isProfileView = false,
  onClose
}: SubscriberFeedProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user } = useAuthStore();
  const {
    posts: storePosts,
    currentIndex: storeCurrentIndex,
    isLoading: storeIsLoading,
    loadSubscriberPosts,
    nextPost: nextPostAction,
    previousPost: previousPostAction,
    toggleLike: toggleLikeAction,
    incrementCommentCount
  } = useFeedStore();

  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs, loadSubscriptions } = useSubscriptionStore();

  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(!isProfileView);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showPpvModal, setShowPpvModal] = useState(false);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);

  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedCreatorForTip, setSelectedCreatorForTip] = useState<PostData['creator'] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    if (isProfileView && initialPostsProp) {
      const transformedPosts = initialPostsProp.map(p => ({
        ...p,
        mediaUrl: (p as any).media || (p as any).mediaUrl,
        creator: (p as any).creator,
        creatorId: (p as any).creatorId || (p as any).creator.id,
      }));
      setPosts(transformedPosts as ServicePostData[]);
      setCurrentIndex(initialIndex);
      setIsLoading(false);
    } else if (!isProfileView) {
      loadSubscriberPosts();
    }
  }, [isProfileView, initialPostsProp, initialIndex, loadSubscriberPosts]);

  useEffect(() => {
    if (!isProfileView) {
      setPosts(storePosts);
      setCurrentIndex(storeCurrentIndex);
      setIsLoading(storeIsLoading);
    }
  }, [isProfileView, storePosts, storeCurrentIndex, storeIsLoading]);

  const currentPost = posts[currentIndex];

  useEffect(() => {
    if (!currentPost?.creatorId) {
      setCreatorTiers([]);
      return;
    }

    const fetchTiers = async () => {
      try {
        const fetchedTiers = await tierService.getCreatorTiers(currentPost.creatorId);
        const sortedTiers = (fetchedTiers || []).sort((a, b) => a.price - b.price);
        setCreatorTiers(sortedTiers);
      } catch (err) {
        console.error("Failed to fetch tiers for modal", err);
        setCreatorTiers([]);
      }
    };
    fetchTiers();
  }, [currentPost?.creatorId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPpvModal || showComments || showTipModal || showSubscriptionModal) return;
      if (!isProfileView) {
        if (e.key === 'ArrowDown') nextPostAction();
        else if (e.key === 'ArrowUp') previousPostAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileView, nextPostAction, previousPostAction, showPpvModal, showComments, showTipModal, showSubscriptionModal]);

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1 || showPpvModal || showComments || showTipModal || showSubscriptionModal) return;
    isScrolling.current = true;
    if (e.deltaY > 0 && currentIndex < posts.length - 1) {
      if (isProfileView) setCurrentIndex(i => i + 1); else nextPostAction();
    } else if (e.deltaY < 0 && currentIndex > 0) {
      if (isProfileView) setCurrentIndex(i => i - 1); else previousPostAction();
    }
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    if (posts.length <= 1 || showPpvModal || showComments || showTipModal || showSubscriptionModal) return;
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0 && currentIndex < posts.length - 1) {
        if (isProfileView) setCurrentIndex(i => i + 1); else nextPostAction();
      } else if (deltaY < 0 && currentIndex > 0) {
        if (isProfileView) setCurrentIndex(i => i - 1); else previousPostAction();
      }
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
  };
  const handleTouchStartCapture = (e: React.TouchEvent) => {
    handleTouchStart.current = { y: e.touches[0].clientY };
  };

  const handleLike = async (postId: string) => {
    if (isProfileView) {
      // TODO: Lokale Like-Logik wenn nötig
    } else {
      await toggleLikeAction(postId);
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  const handleCommentAdded = () => {
    if (selectedPostIdForComments) {
        if (!isProfileView) {
            incrementCommentCount(selectedPostIdForComments);
        } else {
             setPosts(prev => prev.map(p =>
                p.id === selectedPostIdForComments
                    ? { ...p, comments: p.comments + 1 }
                    : p
            ));
        }
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link kopiert!', description: 'Der Link zum Post wurde in die Zwischenablage kopiert.' });
    }, (err) => {
      console.error('Error copying to clipboard:', err);
      toast({ title: 'Fehler', description: 'Link konnte nicht kopiert werden.', variant: 'destructive' });
    });
  };

  const handleShare = async (postId: string, creatorUsername: string, creatorName: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    const shareText = `Schau dir diesen Post von ${creatorName} auf OnlyYours an!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `OnlyYours - ${creatorName}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const handleTipClick = (e: React.MouseEvent, creator: PostData['creator']) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Bitte anmelden", description: "Sie müssen angemeldet sein, um ein Trinkgeld zu geben.", variant: "destructive" });
      return;
    }
    setSelectedCreatorForTip(creator);
    setShowTipModal(true);
  };

  const handleTipSuccess = () => {
    console.log("Tip success!");
  };

  const handlePpvClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPpvModal(true);
  };

  const handleSubscribeClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!user) {
      toast({ title: "Bitte anmelden", description: "Sie müssen angemeldet sein.", variant: "destructive" });
      return;
    }
    if (creatorTiers.length === 0) {
       toast({ title: "Fehler", description: "Dieser Creator bietet (noch) keine Abos an.", variant: "destructive" });
       return;
    }

    setShowPpvModal(false);
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionComplete = () => {
    setShowSubscriptionModal(false);
    toast({ title: "Erfolgreich abonniert!", description: "Der Post ist jetzt freigeschaltet." });
    loadSubscriptions();
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    setShowPpvModal(false);
    if (!isProfileView) {
      loadSubscriberPosts();
    }
  };

  // --- ÄNDERUNG: Container auf h-full setzen ---
  if (isLoading || (isLoadingSubs && !isProfileView)) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Lade Feed...</p>
      </div>
    );
  }
  if (!currentPost && isProfileView) {
    return (
      <div className="fixed inset-0 top-16 z-40 bg-background flex items-center justify-center md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]">
        {onClose && <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-4 right-4 z-50"><XIcon/></Button>}
        <p className="text-muted-foreground">Post nicht gefunden.</p>
      </div>
    );
  }
  if (!currentPost && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Keine abonnierten Posts zum Anzeigen.</p>
      </div>
    );
  }
  if (!currentPost) {
    return null;
  }

  const hasAccess = checkAccess(currentPost, user?.id, creatorTiers);

  const canPpv = currentPost.price > 0;
  const requiredTier = currentPost.tier_id ? creatorTiers.find(t => t.id === currentPost.tier_id) : null;
  const cheapestTier = creatorTiers.length > 0 ? creatorTiers[0] : null;
  const canSubscribe = currentPost.tier_id !== null || (currentPost.tier_id === null && creatorTiers.length > 0);

  let subscribeText = "Mit Abo freischalten";
  if (requiredTier) {
    subscribeText = `Mit "${requiredTier.name}"-Abo freischalten`;
  } else if (cheapestTier) {
    subscribeText = `Abonnieren (ab ${cheapestTier.price.toFixed(2)}€)`;
  } else {
    subscribeText = "Abonnieren nicht verfügbar";
  }

  const activeSub = useSubscriptionStore.getState().subscriptionMap.get(currentPost.creatorId);
  if (requiredTier && activeSub) {
      subscribeText = `Upgrade auf "${requiredTier.name}" erforderlich`;
  } else if (requiredTier) {
      subscribeText = `Mit "${requiredTier.name}"-Abo freischalten`;
  }

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          // --- ÄNDERUNG: h-full statt h-[100dvh] ---
          "w-full h-full overflow-hidden relative bg-black",
          isProfileView && "fixed inset-0 z-40 md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]"
        )}
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
        {isProfileView && onClose && (
           <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
           >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
           </Button>
        )}

        <motion.div
           key={currentPost.id}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.3 }}
           className="h-full w-full relative"
         >
            <div
              className="w-full h-full"
              onClick={() => { if(hasAccess) return; }}
            >
              {currentPost.mediaType === 'video' ? (
                <video
                  src={currentPost.mediaUrl}
                  autoPlay muted loop playsInline
                  className={cn(
                    "w-full h-full object-cover",
                    !hasAccess && "filter blur-2xl"
                  )}
                />
              ) : (
                <img
                  src={hasAccess ? currentPost.mediaUrl : (currentPost.thumbnail_url || currentPost.mediaUrl)}
                  alt={currentPost.caption || ""}
                  className={cn(
                    "w-full h-full object-cover",
                    !hasAccess && "filter blur-2xl"
                  )}
                />
              )}
            </div>

            {!hasAccess && (
              <div
                className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-default p-8"
              >
                <LockIcon className="w-16 h-16 text-foreground" />

                {canPpv && (
                  <Button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 w-full max-w-sm"
                    onClick={handlePpvClick}
                  >
                    {`Beitrag für ${currentPost.price.toFixed(2)}€ freischalten`}
                  </Button>
                )}

                {canPpv && canSubscribe && (
                  <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        ODER
                      </span>
                    </div>
                  </div>
                )}

                {canSubscribe && (
                  <Button
                    variant={canPpv ? "outline" : "secondary"}
                    className={cn(
                        "text-lg px-8 py-6 w-full max-w-sm",
                        canPpv
                            ? "bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    )}
                    onClick={handleSubscribeClick}
                  >
                    <UserCheckIcon className="w-5 h-5 mr-2" />
                    {subscribeText}
                  </Button>
                )}
              </div>
            )}

            {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

            <div className="absolute top-4 left-4 right-20 z-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isProfileView && navigate(`/profile/${currentPost.creator.username || currentPost.creatorId}`)}>
                    <Avatar className="w-12 h-12 border-2 border-foreground">
                        <AvatarImage src={currentPost.creator.avatar} alt={currentPost.creator.name} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {currentPost.creator.name ? currentPost.creator.name.charAt(0) : ''}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-foreground drop-shadow-lg">
                        {currentPost.creator.name}
                        </p>
                        {!isProfileView && (
                            <p className="text-sm text-foreground/80 drop-shadow-lg">
                                @{currentPost.creator.username || currentPost.creatorId}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6 md:bottom-8 pb-safe">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => hasAccess && handleLike(currentPost.id)}
                    className="flex flex-col items-center gap-1"
                    disabled={!hasAccess}
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <HeartIcon
                        className={cn(
                            "w-7 h-7",
                            currentPost.isLiked ? 'fill-secondary text-secondary' : 'text-foreground',
                            !hasAccess && "opacity-50"
                        )}
                        strokeWidth={1.5}
                        />
                    </div>
                    <span className={cn("text-sm font-medium text-foreground drop-shadow-lg", !hasAccess && "opacity-50")}>
                        {(currentPost.likes).toLocaleString()}
                    </span>
                </motion.button>

                <button
                    onClick={() => handleCommentClick(currentPost.id)}
                    className="flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <MessageCircleIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-medium text-foreground drop-shadow-lg">
                        {currentPost.comments}
                    </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const creator = currentPost.creator;
                    handleShare(currentPost.id, creator.username || creator.id, creator.name);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <Share2Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                </button>

                <button
                  onClick={(e) => handleTipClick(e, currentPost.creator)}
                  className="flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <DollarSignIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                </button>
            </div>

            <div className="absolute bottom-4 left-4 right-20 z-10 md:bottom-8 pb-safe">
                <p className={cn("text-foreground drop-shadow-lg mb-2", !hasAccess && "filter blur-sm select-none")}>
                  {hasAccess ? currentPost.caption : "Abonnieren oder kaufen, um die Beschreibung zu sehen."}
                </p>
                <div className="flex flex-wrap gap-2">
                {currentPost.hashtags.map((tag) => (
                    <span key={tag} className="text-secondary text-sm drop-shadow-lg">
                    #{tag}
                    </span>
                ))}
                </div>
            </div>
         </motion.div>
      </div>

      <AnimatePresence>
        {selectedPostIdForComments !== null && showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setSelectedPostIdForComments(null);
            }}
            post={posts.find(p => p.id === selectedPostIdForComments)}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </AnimatePresence>

      {showPpvModal && currentPost && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={currentPost}
            onPaymentSuccess={handlePurchaseSuccess}
            creatorTiers={creatorTiers}
            onSubscribeClick={handleSubscribeClick}
         />
      )}

      {showSubscriptionModal && currentPost && creatorTiers.length > 0 && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creator={{
            id: currentPost.creatorId,
            name: currentPost.creator.name,
          }}
          tiers={creatorTiers}
          onSubscriptionComplete={handleSubscriptionComplete}
        />
      )}

      {showTipModal && selectedCreatorForTip && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creator={{ id: selectedCreatorForTip.id, name: selectedCreatorForTip.name }}
          onTipSuccess={handleTipSuccess}
        />
      )}
    </>
  );
}