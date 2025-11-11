// src/components/fan/ProfilePostViewer.tsx
import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, LockIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
// --- NEUE IMPORTS ---
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
import type { Post as ServicePostData } from '../../services/postService';
// --- ENDE ---


// --- Interface für Posts (angepasst an ServicePostData) ---
export interface CreatorInfo {
  name: string;
  avatar: string;
  username: string;
  isVerified?: boolean;
}

export interface PostData extends Omit<ServicePostData, 'creator'> {
  creator: CreatorInfo;
  media: string; // mediaUrl wird als 'media' übergeben
}
// --- Ende Interface ---

interface ProfilePostViewerProps {
  initialPosts: PostData[]; // Posts werden jetzt immer übergeben
  initialIndex: number;    // Startindex
  onClose: () => void;     // Schließen-Funktion
}

export default function ProfilePostViewer({
  initialPosts,
  initialIndex,
  onClose
}: ProfilePostViewerProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs } = useSubscriptionStore();

  const [posts] = useState<PostData[]>(initialPosts);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Lokaler Like-State (da dieser Viewer nicht an den FeedStore angebunden ist)
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: string]: number }>({});

  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const [showPpvModal, setShowPpvModal] = useState(false);

  // --- NEU: Tiers für PPV-Modal (wird in CreatorProfile.tsx noch nicht geladen, daher leer) ---
  // In SearchPage.tsx (wo es herkommt) wird es ebenfalls nicht geladen.
  // Wir übergeben ein leeres Array an das PpvModal, falls es benötigt wird.
  // HINWEIS: Das PpvModal in *diesem* Viewer kann aktuell kein Abo anbieten, nur PPV.
  const creatorTiersForPpvModal: Tier[] = [];
  // --- ENDE ---

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

  // Index zurücksetzen
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);


  // ----- Scrolling/Swiping Logic -----
  const scrollThreshold = 50;
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1 || showPpvModal || showComments) return;
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
    if (posts.length <= 1 || showPpvModal || showComments) return;
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
  // ----- Ende Scrolling -----

  // Like/Comment Handler
  const handleLike = (postId: string) => {
    // TODO: Lokale Like-Logik implementieren (Optimistic Update + Service Call)
    // Vorerst nur lokaler State:
    setIsLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
    setLikes((prev) => {
        const currentLikes = prev[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0;
        return {
          ...prev,
          [postId]: currentLikes + (isLiked[postId] ? -1 : 1),
        };
    });
    // await postService.toggleLike(postId); // Echter Aufruf
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
    // Da wir in einem Modal sind, müssen wir den Parent (CreatorProfile) nicht
    // unbedingt neu laden. Der `checkAccess` wird beim nächsten Rendern (durch addPurchasedPost)
    // den Zugriff korrekt (optimistisch) bewerten.
    setShowPpvModal(false); // Modal nach Erfolg schließen
  };

  const currentPost = posts[currentIndex];

  if (!currentPost) {
     return (
        <div className="fixed top-16 left-0 right-0 bottom-16 z-40 bg-background flex items-center justify-center md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]">
            <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-4 right-4 z-50"><XIcon/></Button>
            <p className="text-muted-foreground">Post wird geladen...</p>
        </div>
     );
  }

  // Zugriff prüfen
  // Wir müssen das `PostData`-Objekt in ein `Post`-Objekt umwandeln, das `checkAccess` erwartet
  const postForCheck: ServicePostData = {
    ...currentPost,
    mediaUrl: currentPost.media,
    thumbnail_url: currentPost.thumbnail_url || currentPost.media,
  };
  const hasAccess = checkAccess(postForCheck, user?.id);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "fixed top-16 left-0 right-0 bottom-16 z-40 overflow-hidden bg-black", // bg-black Fallback
          "md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]"
        )}
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
         <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
           >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
           </Button>

        <motion.div
           key={currentIndex}
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
                  src={currentPost.media}
                  autoPlay muted loop playsInline
                  className={cn(
                    "w-full h-full object-cover",
                    !hasAccess && "filter blur-2xl"
                  )}
                />
              ) : (
                <img
                  src={hasAccess ? currentPost.media : (currentPost.thumbnail_url || currentPost.media)}
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
                    : `Abonnieren, um zu sehen`
                  }
                </Button>
              </div>
            )}

            {/* Gradient (nur bei Zugriff) */}
            {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}


           {/* --- KORREKTUR HIER: Creator Info klickbar gemacht --- */}
           <div className="absolute top-4 left-4 right-20 z-10">
             <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  onClose(); // Viewer schließen
                  navigate(`/profile/${currentPost.creator.username}`);
                }}
             >
               <Avatar className="w-12 h-12 border-2 border-foreground">
                 <AvatarImage src={currentPost.creator.avatar} alt={currentPost.creator.name} />
                 <AvatarFallback className="bg-secondary text-secondary-foreground">
                   {currentPost.creator.name.charAt(0)}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <p className="font-medium text-foreground drop-shadow-lg group-hover:underline">
                   {currentPost.creator.name}
                 </p>
                 {/* --- @username hinzugefügt --- */}
                 <p className="text-sm text-foreground/80 drop-shadow-lg">
                    @{currentPost.creator.username}
                 </p>
                 {/* --- Ende --- */}
               </div>
             </div>
           </div>
           {/* --- ENDE KORREKTUR --- */}

           {/* Icons rechts */}
           <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
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
                            isLiked[currentPost.id] ? 'fill-secondary text-secondary' : 'text-foreground',
                            !hasAccess && "opacity-50"
                        )}
                        strokeWidth={1.5}
                        />
                    </div>
                    <span className={cn("text-sm font-medium text-foreground drop-shadow-lg", !hasAccess && "opacity-50")}>
                        {(likes[currentPost.id] ?? currentPost.likes).toLocaleString()}
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
           </div>

           {/* Caption & Hashtags */}
           <div className="absolute bottom-4 left-4 right-20 z-10">
                <p className={cn("text-foreground drop-shadow-lg mb-2", !hasAccess && "filter blur-sm select-none")}>
                  {hasAccess ? currentPost.caption : "Gesperrter Inhalt"}
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
      {showPpvModal && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={postForCheck} // Übergibt das ServicePostData-Objekt
            onPaymentSuccess={handlePurchaseSuccess}
            creatorTiers={creatorTiersForPpvModal} // Übergibt leeres Array (oder geladene Tiers)
            onSubscribeClick={() => {
              // Diese Funktion navigiert zum Profil, da wir im Viewer keine Tiers laden
              setShowPpvModal(false);
              onClose(); // Viewer schließen
              navigate(`/profile/${currentPost.creator.username}`);
            }}
         />
      )}
    </>
  );
}