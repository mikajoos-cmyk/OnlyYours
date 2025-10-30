import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '../../stores/feedStore';
import ProfilePostViewer from './ProfilePostViewer';

export default function DiscoveryFeed() {
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const navigate = useNavigate();

  // Zustand Store für den Feed-State
  const { posts, currentIndex, isLoading, error, loadDiscoveryPosts, nextPost, previousPost, toggleLike } = useFeedStore();

  // Daten beim ersten Rendern laden
  useEffect(() => {
    // Nur laden, wenn noch keine Posts vorhanden sind, um unnötige Ladevorgänge zu vermeiden
    if (posts.length === 0) {
      loadDiscoveryPosts();
    }
  }, [loadDiscoveryPosts, posts.length]);

  // Posts für den Viewer vorbereiten
  const viewerPosts = posts.map(post => ({ ...post, isLiked: post.isLiked || false }));

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  // Tastatur-Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        nextPost();
      } else if (e.key === 'ArrowUp') {
        previousPost();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPost, previousPost]);

  // Mausrad-Navigation
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < 50) return;
    isScrolling.current = true;
    if (e.deltaY > 0) {
      nextPost();
    } else if (e.deltaY < 0) {
      previousPost();
    }
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  // Touch-Navigation
  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0) {
        nextPost();
      } else if (deltaY < 0) {
        previousPost();
      }
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

  const currentPost = posts[currentIndex];

  // Lade- und Fehlerzustände behandeln
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-foreground">Lade Posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!currentPost) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-foreground">Keine Posts gefunden.</p>
      </div>
    );
  }

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
          key={currentIndex} // Wichtig für die Animation beim Post-Wechsel
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.5 }}
          className="h-full w-full relative"
        >
          {/* --- NEU: Bedingtes Rendern für Video/Bild --- */}
          {currentPost.mediaType === 'video' ? (
            <video
              src={currentPost.mediaUrl || currentPost.media}
              autoPlay
              muted // WICHTIG: Autoplay funktioniert in Browsern nur ohne Ton
              loop
              playsInline // Wichtig für iOS-Geräte
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => handlePostClick(currentIndex)}
            />
          ) : (
            <img
              src={currentPost.mediaUrl || currentPost.media}
              alt={currentPost.caption}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => handlePostClick(currentIndex)}
            />
          )}
          {/* --- ENDE --- */}

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

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
                  @{currentPost.creatorId}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleLike(currentPost.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <HeartIcon
                  className={`w-7 h-7 ${currentPost.isLiked ? 'fill-secondary text-secondary' : 'text-foreground'}`}
                  strokeWidth={1.5}
                />
              </div>
              <span className="text-sm font-medium text-foreground drop-shadow-lg">
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

      {isViewerOpen && (
        <ProfilePostViewer
          initialPosts={viewerPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}

