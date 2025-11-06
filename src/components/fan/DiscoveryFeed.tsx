import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, LockIcon } from 'lucide-react'; // LockIcon hinzugefügt
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button'; // Button hinzugefügt
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '../../stores/feedStore';
import ProfilePostViewer from './ProfilePostViewer'; // Alter Viewer (könnte veraltet sein)
import { useAuthStore } from '../../stores/authStore'; // AuthStore für User-ID
import { useSubscriptionStore } from '../../stores/subscriptionStore'; // Sub-Store für Zugriffs-Check
import PpvModal from './PpvModal'; // Import PPV Modal
import { cn } from '../../lib/utils'; // cn importieren

export default function DiscoveryFeed() {
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Viewer-Logik (kann evtl. entfernt/angepasst werden, wenn Klick = PPV-Modal)
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  // PPV Modal State
  const [showPpvModal, setShowPpvModal] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const navigate = useNavigate();

  // Stores
  const { user } = useAuthStore();
  const { posts, currentIndex, isLoading, error, loadDiscoveryPosts, nextPost, previousPost, toggleLike } = useFeedStore();
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs } = useSubscriptionStore();

  // Daten laden
  useEffect(() => {
    if (posts.length === 0) {
      loadDiscoveryPosts();
    }
  }, [loadDiscoveryPosts, posts.length]);

  // Tastatur-Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showPpvModal || showComments || isViewerOpen) return; // Nicht navigieren, wenn Modal offen ist
      if (e.key === 'ArrowDown') nextPost();
      else if (e.key === 'ArrowUp') previousPost();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPost, previousPost, showPpvModal, showComments, isViewerOpen]);

  // Mausrad-Navigation
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < 50 || showPpvModal || showComments || isViewerOpen) return;
    isScrolling.current = true;
    if (e.deltaY > 0) nextPost();
    else if (e.deltaY < 0) previousPost();
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  // Touch-Navigation
  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    if (showPpvModal || showComments || isViewerOpen) return;
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0) nextPost();
      else if (deltaY < 0) previousPost();
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
  };
  const handleTouchStartCapture = (e: React.TouchEvent) => {
    handleTouchStart.current = { y: e.touches[0].clientY };
  };

  const handleLike = (postId: string) => {
    toggleLike(postId);
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostId(postId);
    setShowComments(true);
  };

  // --- AKTUALISIERTE KLICK-LOGIK ---
  const handleMediaClick = (index: number, hasAccess: boolean) => {
    if (hasAccess) {
      // alter Viewer (optional)
      // setSelectedPostIndex(index);
      // setIsViewerOpen(true);
      // ODER: Nichts tun, da der Inhalt bereits sichtbar ist
    } else {
      // PPV-Modal öffnen
      setShowPpvModal(true);
    }
  };

  // Callback nach erfolgreichem Kauf
  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    // Optional: Feed neu laden, um RLS-Änderung zu erhalten
    // loadDiscoveryPosts();
  };

  const currentPost = posts[currentIndex];

  // Lade- und Fehlerzustände
  if (isLoading || isLoadingSubs) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-foreground">Lade Posts...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (!currentPost) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-foreground">Keine Posts gefunden.</p>
      </div>
    );
  }

  // Zugriff prüfen
  const hasAccess = checkAccess(currentPost, user?.id);

  return (
    <>
      <div
        ref={containerRef}
        className="w-full overflow-hidden relative h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]"
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }} // Animation angepasst
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full w-full relative bg-black"
        >
          {/* --- LOGIK FÜR VERPIXELTEN INHALT --- */}
          <div
            className="w-full h-full"
            onClick={() => handleMediaClick(currentIndex, hasAccess)}
          >
            {currentPost.mediaType === 'video' ? (
              <video
                src={currentPost.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className={cn(
                  "w-full h-full object-cover",
                  !hasAccess && "filter blur-2xl" // Verpixeln
                )}
              />
            ) : (
              <img
                src={currentPost.thumbnail_url || currentPost.mediaUrl} // Thumbnail für gesperrte Bilder
                alt={currentPost.caption}
                className={cn(
                  "w-full h-full object-cover",
                  !hasAccess && "filter blur-2xl" // Verpixeln
                )}
              />
            )}
          </div>

          {/* Overlay für gesperrte Inhalte */}
          {!hasAccess && (
            <div
              className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={() => handleMediaClick(currentIndex, hasAccess)}
            >
              <LockIcon className="w-16 h-16 text-foreground" />
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6">
                Beitrag für {currentPost.price.toFixed(2)}€ freischalten
              </Button>
            </div>
          )}

          {/* Gradient (nur anzeigen, wenn Zugriff besteht) */}
          {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

          {/* Creator Info (immer sichtbar) */}
          <div className="absolute top-4 left-4 right-20 z-10">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${currentPost.creator.username || currentPost.creatorId}`)}>
              <Avatar className="w-12 h-12 border-2 border-foreground">
                <AvatarImage src={currentPost.creator.avatar} alt={currentPost.creator.name} />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {currentPost.creator.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground drop-shadow-lg">
                  {currentPost.creator.name}
                </p>
                <p className="text-sm text-foreground/80 drop-shadow-lg">
                  @{currentPost.creator.username || currentPost.creatorId}
                </p>
              </div>
            </div>
          </div>

          {/* Icons rechts (immer sichtbar) */}
          <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => hasAccess && handleLike(currentPost.id)} // Like nur bei Zugriff
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
                {currentPost.likes?.toLocaleString() || 0}
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

            {/* ... (Share & Tip Buttons) ... */}
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

          {/* Caption (immer sichtbar) */}
          <div className="absolute bottom-4 left-4 right-20 z-10">
            <p className="text-foreground drop-shadow-lg mb-2">{currentPost.caption}</p>
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

      {/* Comment Sheet Modal */}
      <AnimatePresence>
        {selectedPostId !== null && showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setSelectedPostId(null);
            }}
            post={posts.find(p => p.id === selectedPostId)}
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

      {/* Alter Post Viewer (optional, falls noch benötigt) */}
      {isViewerOpen && (
        <ProfilePostViewer
          initialPosts={posts.map(p => ({ ...p, media: p.mediaUrl }))}
          initialIndex={selectedPostIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}