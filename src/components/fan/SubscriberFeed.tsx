// src/components/fan/SubscriberFeed.tsx
import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, LockIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFeedStore } from '../../stores/feedStore';
import type { Post as ServicePostData } from '../../services/postService';
// --- NEUE IMPORTS ---
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
// --- ENDE ---


// Interface für PostData anpassen
interface PostData extends Omit<ServicePostData, 'creator'> {
  creator: {
    id: string; // ID hinzugefügt
    name: string;
    avatar: string;
    username: string;
    isVerified?: boolean;
  };
  media: string; // 'media' statt 'mediaUrl'
}


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

  // Zustand aus Stores holen
  const { user } = useAuthStore();
  const {
    posts: storePosts,
    currentIndex: storeCurrentIndex,
    isLoading: storeIsLoading,
    loadSubscriberPosts,
    nextPost: nextPostAction,
    previousPost: previousPostAction,
    toggleLike: toggleLikeAction
  } = useFeedStore();

  // Neuer Store für Zugriffs-Check
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs } = useSubscriptionStore();

  // Lokaler State
  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(!isProfileView);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showPpvModal, setShowPpvModal] = useState(false); // PPV Modal

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Daten laden oder aus Props übernehmen
  useEffect(() => {
    if (isProfileView && initialPostsProp) {
      const transformedPosts = initialPostsProp.map(p => ({
        ...p,
        mediaUrl: (p as PostData).media || (p as ServicePostData).mediaUrl,
        creator: (p as ServicePostData).creator || (p as PostData).creator,
        creatorId: (p as ServicePostData).creatorId || (p as PostData).creator.id,
      }));
      setPosts(transformedPosts as ServicePostData[]);
      setCurrentIndex(initialIndex);
      setIsLoading(false);
    } else if (!isProfileView) {
      loadSubscriberPosts();
    }
  }, [isProfileView, initialPostsProp, initialIndex, loadSubscriberPosts]);

  // Store-Daten in lokalen State spiegeln
  useEffect(() => {
    if (!isProfileView) {
      setPosts(storePosts);
      setCurrentIndex(storeCurrentIndex);
      setIsLoading(storeIsLoading);
    }
  }, [isProfileView, storePosts, storeCurrentIndex, storeIsLoading]);


  // ----- Scrolling/Swiping Logic -----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPpvModal || showComments) return; // Modale blockieren Navigation
      if (!isProfileView) {
        if (e.key === 'ArrowDown') nextPostAction();
        else if (e.key === 'ArrowUp') previousPostAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileView, nextPostAction, previousPostAction, showPpvModal, showComments]);

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1 || showPpvModal || showComments) return;
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
    if (posts.length <= 1 || showPpvModal || showComments) return;
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
  // ----- Ende Scrolling -----

  // --- INTERAKTIONEN ---
  const handleLike = async (postId: string) => {
    if (isProfileView) {
      // TODO: Lokale Like-Logik für Profilansicht
    } else {
      await toggleLikeAction(postId);
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  const handleMediaClick = (hasAccess: boolean) => {
    if (!hasAccess) {
      setShowPpvModal(true);
    }
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    // Im Subscriber-Feed laden wir neu, um sicherzustellen, dass die RLS greift
    // (obwohl addPurchasedPost es optimistisch setzt)
    if (!isProfileView) {
      loadSubscriberPosts();
    }
  };

  // --- RENDER-LOGIK ---
  const currentPost = posts[currentIndex];

  if (isLoading || (isLoadingSubs && !isProfileView)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
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
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-muted-foreground">Keine abonnierten Posts zum Anzeigen.</p>
      </div>
    );
  }
  if (!currentPost) {
    return null;
  }

  // Zugriff prüfen
  const hasAccess = checkAccess(currentPost, user?.id);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "w-full overflow-hidden relative bg-black", // bg-black als Fallback
          isProfileView
            ? "fixed top-16 left-0 right-0 bottom-16 z-40 md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]"
            : "h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]"
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
            {/* --- VERPIXELTE LOGIK --- */}
            <div
              className="w-full h-full"
              onClick={() => handleMediaClick(hasAccess)}
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
                  alt={currentPost.caption}
                  className={cn(
                    "w-full h-full object-cover",
                    !hasAccess && "filter blur-2xl"
                  )}
                />
              )}
            </div>

            {/* Gesperrt-Overlay */}
            {!hasAccess && (
              <div
                className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-pointer"
                onClick={() => handleMediaClick(hasAccess)}
              >
                <LockIcon className="w-16 h-16 text-foreground" />
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6">
                  {currentPost.price > 0
                    ? `Beitrag für ${currentPost.price.toFixed(2)}€ freischalten`
                    : `Abonnieren, um zu sehen` // Fallback für Tier-Sperre ohne PPV
                  }
                </Button>
              </div>
            )}

            {/* Gradient (nur bei Zugriff) */}
            {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

            {/* Creator Info */}
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

            {/* Icons rechts */}
            <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6 md:bottom-8">
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
                {/* ... (Share, Tip) ... */}
                <button className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <Share2Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                </button>
                <button className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <DollarSignIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                </button>
            </div>

            {/* Caption und Hashtags */}
            <div className="absolute bottom-4 left-4 right-20 z-10 md:bottom-8">
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

      {/* Comments Sheet */}
      <AnimatePresence>
        {selectedPostIdForComments !== null && showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setSelectedPostIdForComments(null);
            }}
            post={posts.find(p => p.id === selectedPostIdForComments)}
          />
        )}
      </AnimatePresence>

      {/* PPV Modal */}
      {showPpvModal && currentPost && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={currentPost}
            onPaymentSuccess={handlePurchaseSuccess}
         />
      )}
    </>
  );
}