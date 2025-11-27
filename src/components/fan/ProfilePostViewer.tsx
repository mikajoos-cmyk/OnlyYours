import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, LockIcon, FlagIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
import type { Post as ServicePostData } from '../../services/postService';
import { postService } from '../../services/postService';
import { tierService, Tier } from '../../services/tierService';
import ReportModal from './ReportModal'; // <-- NEU
import { useToast } from '../../hooks/use-toast'; // <-- Für Feedback
import { SecureMedia } from '../ui/SecureMedia';

export interface CreatorInfo {
  name: string;
  avatar: string;
  username: string;
  isVerified?: boolean;
}

export interface PostData extends Omit<ServicePostData, 'creator'> {
  creator: CreatorInfo;
  media: string;
}

interface ProfilePostViewerProps {
  initialPosts: PostData[];
  initialIndex: number;
  onClose: () => void;
  initialCreatorTiers?: Tier[];
  // NEU: Callbacks für Status-Updates im Parent
  onLikeToggle?: (postId: string) => void;
  onCommentAdded?: (postId: string) => void;
}

export default function ProfilePostViewer({
  initialPosts,
  initialIndex,
  onClose,
  initialCreatorTiers = [],
  onLikeToggle,
  onCommentAdded
}: ProfilePostViewerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { checkAccess, addPurchasedPost } = useSubscriptionStore();
  const { toast } = useToast();

  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: string]: number }>({});

  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showPpvModal, setShowPpvModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // <-- NEU

  const [loadedCreatorTiers, setLoadedCreatorTiers] = useState<Tier[]>(initialCreatorTiers);

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Likes initialisieren
  useEffect(() => {
    const initialLikesState: { [key: string]: number } = {};
    const initialIsLikedState: { [key: string]: boolean } = {};
    initialPosts.forEach((post) => {
      initialLikesState[post.id] = post.likes;
      initialIsLikedState[post.id] = post.isLiked || false;
    });
    setLikes(initialLikesState);
    setIsLiked(initialIsLikedState);
  }, [initialPosts]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentPost = posts[currentIndex];

  useEffect(() => {
    if (currentPost && loadedCreatorTiers.length === 0) {
        const loadTiers = async () => {
            try {
                const tiers = await tierService.getCreatorTiers(currentPost.creatorId);
                setLoadedCreatorTiers(tiers.sort((a, b) => a.price - b.price));
            } catch (e) {
                console.error("Failed to load tiers inside viewer", e);
            }
        };
        loadTiers();
    }
  }, [currentPost?.creatorId]);

  const scrollThreshold = 50;
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1 || showPpvModal || showComments || showReportModal) return;
    isScrolling.current = true;
    if (e.deltaY > 0 && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setTimeout(() => { isScrolling.current = false; }, 800);
  };
  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    if (posts.length <= 1 || showPpvModal || showComments || showReportModal) return;
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0 && currentIndex < posts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
  };
  const handleTouchStartCapture = (e: React.TouchEvent) => {
    handleTouchStart.current = { y: e.touches[0].clientY };
  };

  // --- AKTUALISIERT: handleLike ---
  const handleLike = async (postId: string) => {
    // 1. Optimistisches Update im Viewer
    setIsLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
    setLikes((prev) => {
        const currentLikes = prev[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0;
        return {
          ...prev,
          [postId]: currentLikes + (isLiked[postId] ? -1 : 1),
        };
    });

    try {
        // 2. API Call
        await postService.toggleLike(postId);

        // 3. Parent (Profil-Seite) benachrichtigen, damit es dort auch gespeichert bleibt
        if (onLikeToggle) {
            onLikeToggle(postId);
        }
    } catch (e) {
        console.error("Failed to toggle like:", e);
        // Rollback
        setIsLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
        setLikes((prev) => {
            const currentLikes = prev[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0;
            return {
                ...prev,
                [postId]: currentLikes + (isLiked[postId] ? 1 : -1),
            };
        });
    }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  // --- AKTUALISIERT: handleCommentAdded ---
  const handleCommentAdded = () => {
      if (currentPost) {
          // 1. Update im Viewer
          setPosts(prev => prev.map(p =>
              p.id === currentPost.id
                  ? { ...p, comments: p.comments + 1 }
                  : p
          ));

          // 2. Update im Parent (Profil)
          if (onCommentAddedCallback) {
              onCommentAddedCallback(currentPost.id);
          }
      }
  };

  // Rename prop to match inside to avoid conflict
  const onCommentAddedCallback = onCommentAdded;

  const handleMediaClick = (hasAccess: boolean) => {
    if (!hasAccess) {
      setShowPpvModal(true);
    }
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    setShowPpvModal(false);
  };

  // --- NEU: Report Handler ---
  const handleReportClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!user) {
          toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein.", variant: "destructive" });
          return;
      }
      setShowReportModal(true);
  };
  // --- ENDE ---

  if (!currentPost) {
     return (
        <div className="fixed top-16 left-0 right-0 bottom-16 z-40 bg-background flex items-center justify-center md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]">
            <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-4 right-4 z-50"><XIcon/></Button>
            <p className="text-muted-foreground">Post wird geladen...</p>
        </div>
     );
  }

  const postForCheck: ServicePostData = {
    ...currentPost,
    mediaUrl: currentPost.media,
    thumbnail_url: currentPost.thumbnail_url || currentPost.media,
  };

  const hasAccess = checkAccess(postForCheck, user?.id, loadedCreatorTiers);

  return (
    <>
      <div ref={containerRef} className={cn("fixed top-16 left-0 right-0 bottom-16 z-40 overflow-hidden bg-black", "md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]")} onWheel={handleScroll} onTouchStart={handleTouchStartCapture} onTouchMove={handleTouchMove}>
         <Button onClick={onClose} size="icon" variant="ghost" className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"><XIcon className="w-6 h-6" strokeWidth={1.5} /></Button>

        <motion.div key={currentIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full w-full relative">
            <div className="w-full h-full" onClick={() => handleMediaClick(hasAccess)}>
              <SecureMedia
  path={hasAccess ? currentPost.media : (currentPost.thumbnail_url || currentPost.media)}
  type={currentPost.mediaType}
  alt={currentPost.caption}
  className={cn("w-full h-full", !hasAccess && "filter blur-2xl")}
  autoPlay
  muted
  loop
  playsInline
/>
            </div>

            {!hasAccess && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-pointer" onClick={() => handleMediaClick(hasAccess)}>
                <LockIcon className="w-16 h-16 text-foreground" />
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6">
                  Inhalt freischalten
                </Button>
              </div>
            )}

            {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

           <div className="absolute top-4 left-4 right-20 z-10">
             <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { onClose(); navigate(`/profile/${currentPost.creator.username}`); }}>
               <Avatar className="w-12 h-12 border-2 border-foreground">
                 <AvatarImage src={currentPost.creator.avatar} alt={currentPost.creator.name} />
                 <AvatarFallback className="bg-secondary text-secondary-foreground">{currentPost.creator.name.charAt(0)}</AvatarFallback>
               </Avatar>
               <div>
                 <p className="font-medium text-foreground drop-shadow-lg group-hover:underline">{currentPost.creator.name}</p>
                 <p className="text-sm text-foreground/80 drop-shadow-lg">@{currentPost.creator.username}</p>
               </div>
             </div>
           </div>

           <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => hasAccess && handleLike(currentPost.id)} className="flex flex-col items-center gap-1" disabled={!hasAccess}>
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"><HeartIcon className={cn("w-7 h-7", isLiked[currentPost.id] ? 'fill-secondary text-secondary' : 'text-foreground', !hasAccess && "opacity-50")} strokeWidth={1.5} /></div>
                    <span className={cn("text-sm font-medium text-foreground drop-shadow-lg", !hasAccess && "opacity-50")}>{(likes[currentPost.id] ?? currentPost.likes).toLocaleString()}</span>
                </motion.button>
                <button onClick={() => handleCommentClick(currentPost.id)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center"><MessageCircleIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} /></div>
                    <span className="text-sm font-medium text-foreground drop-shadow-lg">{currentPost.comments}</span>
                </button>

                {/* --- NEU: Report Button --- */}
                <button onClick={handleReportClick} className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100">
                   <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                     <FlagIcon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                   </div>
                </button>
                {/* --- ENDE --- */}
           </div>

           <div className="absolute bottom-4 left-4 right-20 z-10">
                <p className={cn("text-foreground drop-shadow-lg mb-2", !hasAccess && "filter blur-sm select-none")}>{hasAccess ? currentPost.caption : "Gesperrter Inhalt"}</p>
                <div className="flex flex-wrap gap-2">{currentPost.hashtags.map((tag) => (<span key={tag} className="text-secondary text-sm drop-shadow-lg">#{tag}</span>))}</div>
           </div>
         </motion.div>
      </div>

       <AnimatePresence>
        {selectedPostIdForComments !== null && showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => { setShowComments(false); setSelectedPostIdForComments(null); }}
            post={posts.find(p => p.id === selectedPostIdForComments)}
            onCommentAdded={handleCommentAdded}
          />
        )}
      </AnimatePresence>

      {showPpvModal && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={postForCheck}
            onPaymentSuccess={handlePurchaseSuccess}
            creatorTiers={loadedCreatorTiers}
            onSubscribeClick={() => { setShowPpvModal(false); onClose(); navigate(`/profile/${currentPost.creator.username}`); }}
         />
      )}

      {/* --- NEU: Report Modal --- */}
      {currentPost && showReportModal && (
        <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            postId={currentPost.id}
        />
      )}
    </>
  );
}