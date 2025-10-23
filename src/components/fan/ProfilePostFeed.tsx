import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { XIcon } from 'lucide-react';
import MediaCard from './MediaCard'; // Importiere die MediaCard
import CommentsSheet from './CommentsSheet';

// Typdefinitionen (ggf. anpassen oder auslagern)
interface Creator {
  id: string;
  name: string;
  avatarUrl: string; // Angepasst an CreatorProfile Daten
  username: string;
  isVerified?: boolean; // Optional hinzugefügt
}

interface Post {
  id: string;
  thumbnailUrl: string; // Angepasst an CreatorProfile Daten
  type: 'image' | 'video';
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  // MediaCard erwartet mediaUrl und mediaType
  mediaUrl: string;
  mediaType: 'image' | 'video';
  creator: Creator; // MediaCard braucht Creator-Info direkt im Post-Objekt
}

interface ProfilePostFeedProps {
  isOpen: boolean; // Bleibt zur Steuerung der Sichtbarkeit
  onClose: () => void;
  creator: Creator;
  allPosts: any[]; // Ursprünglicher Typ aus CreatorProfile
  initialIndex: number; // Startindex des angeklickten Posts
}

export default function ProfilePostFeed({ isOpen, onClose, creator, allPosts, initialIndex }: ProfilePostFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null); // Verwende ID statt Index für Kommentare
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Transformiere die 'allPosts' Daten in das Format, das MediaCard erwartet
  const formattedPosts: Post[] = allPosts.map(p => ({
    ...p,
    mediaUrl: p.thumbnailUrl, // Annahme: thumbnailUrl ist das anzuzeigende Medium
    mediaType: p.type,        // Übernehme den Typ
    creator: {                // Füge Creator-Info hinzu
      id: creator.id,
      name: creator.name,
      avatar: creator.avatarUrl,
      isVerified: creator.isVerified,
      username: creator.username,
    }
  }));

  useEffect(() => {
    setCurrentIndex(initialIndex); // Setze den Index zurück, wenn sich die initialIndex oder isOpen ändert
  }, [initialIndex, isOpen]);

   // ----- Scrolling/Swiping Logic (kopiert von SubscriberFeed) -----
   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, formattedPosts.length - 1));
      } else if (e.key === 'ArrowUp') {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formattedPosts.length]);

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold) return;
    isScrolling.current = true;
    if (e.deltaY > 0 && currentIndex < formattedPosts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0 && currentIndex < formattedPosts.length - 1) {
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
   // ----- Ende Scrolling/Swiping Logic -----

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  const currentPost = formattedPosts[currentIndex];

  // Verhindere Rendern, wenn nicht offen oder kein Post vorhanden
  if (!isOpen || !currentPost) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-40 bg-background overflow-hidden" // Nimmt den ganzen Bildschirm ein
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
         {/* Schließen-Button */}
         <Button
            onClick={onClose}
            size="icon"
            variant="ghost" // Oder anderes Styling
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
          >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
          </Button>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.5 }}
          className="h-full w-full relative"
        >
          {/* Verwende MediaCard zur Anzeige des Posts */}
          <MediaCard post={currentPost} />
           {/* Override oder anpassen der Icons in MediaCard, falls nötig,
               oder füge hier die Kommentar-Button-Logik hinzu */}
            <button
              onClick={() => handleCommentClick(currentPost.id)}
              className="absolute right-4 bottom-[calc(8rem+1.5rem)] z-20 flex flex-col items-center gap-1" // Position anpassen
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                 {/* Icon aus MediaCard kopieren */}
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-7 h-7 text-foreground"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>
              </div>
              <span className="text-sm font-medium text-foreground drop-shadow-lg">
                {currentPost.comments}
              </span>
            </button>
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
            // Finde den Post anhand der ID für das CommentsSheet
            post={formattedPosts.find(p => p.id === selectedPostIdForComments)}
          />
        )}
      </AnimatePresence>
    </>
  );
}