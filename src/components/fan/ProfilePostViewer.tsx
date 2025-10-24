import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon } from 'lucide-react'; // XIcon hinzugefügt
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button'; // Button hinzugefügt
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils'; // cn importieren

// --- Interface für Posts (ähnlich DiscoveryFeed, ggf. anpassen) ---
export interface CreatorInfo {
  name: string;
  avatar: string;
  username: string;
  isVerified?: boolean;
}

export interface PostData {
  id: string;
  creator: CreatorInfo;
  media: string; // Angepasst von mediaUrl in DiscoveryFeed
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked?: boolean; // Optional
  // mediaType wird nicht direkt benötigt, wenn nur Bilder angezeigt werden
}
// --- Ende Interface ---

interface ProfilePostViewerProps {
  initialPosts: PostData[]; // Posts werden jetzt immer übergeben
  initialIndex: number;    // Startindex
  onClose: () => void;     // Schließen-Funktion
}

// Komponente umbenannt und Props angepasst
export default function ProfilePostViewer({
  initialPosts,
  initialIndex,
  onClose
}: ProfilePostViewerProps) {
  const navigate = useNavigate();
  // State verwendet jetzt die übergebenen Props
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: string]: number }>({});
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Initialisiere Likes und isLiked basierend auf initialPosts
  useEffect(() => {
    setPosts(initialPosts); // Update posts if initialPosts change
    setCurrentIndex(initialIndex); // Reset index if initialIndex changes

    const initialLikesState: { [key: string]: number } = {};
    const initialIsLikedState: { [key: string]: boolean } = {};
    initialPosts.forEach((post) => {
      initialLikesState[post.id] = post.likes;
      initialIsLikedState[post.id] = post.isLiked || false;
    });
    setLikes(initialLikesState);
    setIsLiked(initialIsLikedState);
  }, [initialPosts, initialIndex]); // Abhängigkeiten


  // ----- Scrolling/Swiping Logic (aus DiscoveryFeed übernommen) -----
   useEffect(() => {
     // Tastaturnavigation ist hier vielleicht nicht gewünscht, kann entfernt werden
    // const handleKeyDown = (e: KeyboardEvent) => { ... };
    // window.addEventListener('keydown', handleKeyDown);
    // return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posts.length]);

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1) return;
    isScrolling.current = true;
    if (e.deltaY > 0 && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    setTimeout(() => { isScrolling.current = false; }, 800); // Dauer wie in DiscoveryFeed
  };

  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    if (posts.length <= 1) return;
    const touch = e.touches[0];
    const deltaY = handleTouchStart.current.y - touch.clientY;
    if (Math.abs(deltaY) > 50 && !isScrolling.current) {
      isScrolling.current = true;
      if (deltaY > 0 && currentIndex < posts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      setTimeout(() => { isScrolling.current = false; }, 800); // Dauer wie in DiscoveryFeed
    }
  };
  const handleTouchStartCapture = (e: React.TouchEvent) => {
    handleTouchStart.current = { y: e.touches[0].clientY };
  };
  // ----- Ende Scrolling/Swiping Logic -----

  // Like/Comment Handler (aus DiscoveryFeed angepasst, Post-ID verwenden)
  const handleLike = (postId: string) => {
    setIsLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
    setLikes((prev) => {
        const currentLikes = prev[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0;
        return {
          ...prev,
          [postId]: currentLikes + (isLiked[postId] ? -1 : 1),
        };
    });
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  const currentPost = posts[currentIndex];

  // Fallback, falls etwas schiefgeht
  if (!currentPost) {
     return (
        <div className="fixed top-16 left-0 right-0 bottom-16 z-40 bg-background flex items-center justify-center md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]">
            <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-4 right-4 z-50"><XIcon/></Button>
            <p className="text-muted-foreground">Post wird geladen...</p>
        </div>
     );
  }

  return (
    <>
      {/* Container mit korrekter Positionierung */}
      <div
        ref={containerRef}
        className={cn(
          "fixed top-16 left-0 right-0 bottom-16 z-40 overflow-hidden bg-background", // Grundlegende Stile
          "md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]" // Desktop-Anpassungen
        )}
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
         {/* Schließen-Button */}
         <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
           >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
           </Button>

        {/* Motion Div für den Post-Inhalt und Übergänge */}
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0, /* y: 100 */ }} // Animation wie in DiscoveryFeed
           animate={{ opacity: 1, /* y: 0 */ }}
           exit={{ opacity: 0, /* y: -100 */ }}
           transition={{ duration: 0.5 }} // Dauer wie in DiscoveryFeed
           className="h-full w-full relative" // Wichtig: h-full
         >
           {/* Bild/Video */}
           <img
             src={currentPost.media}
             alt={currentPost.caption}
             className="w-full h-full object-cover"
           />

           {/* Gradient Overlay */}
           <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

           {/* Creator Info (aus DiscoveryFeed übernommen) */}
           <div className="absolute top-4 left-4 right-20 z-10">
             {/* Kein navigate onClick hier, da wir schon im Profil sind */}
             <div className="flex items-center gap-3">
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
                 {/* Username wird hier nicht angezeigt, da wir im Profil sind */}
               </div>
             </div>
           </div>

           {/* Icons rechts (aus DiscoveryFeed übernommen) */}
           <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6"> {/* Position wie in DiscoveryFeed */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleLike(currentPost.id)}
                    className="flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <HeartIcon
                        className={`w-7 h-7 ${
                            isLiked[currentPost.id] ? 'fill-secondary text-secondary' : 'text-foreground'
                        }`}
                        strokeWidth={1.5}
                        />
                    </div>
                    <span className="text-sm font-medium text-foreground drop-shadow-lg">
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

           {/* Caption & Hashtags (aus DiscoveryFeed übernommen) */}
           <div className="absolute bottom-4 left-4 right-20 z-10"> {/* Position wie in DiscoveryFeed */}
                <p className="text-foreground drop-shadow-lg mb-2">{currentPost.caption}</p>
                <div className="flex flex-wrap gap-2">
                    {currentPost.hashtags.map((tag) => (
                        <span key={tag} className="text-secondary text-sm drop-shadow-lg">
                        #{tag}
                        </span>
                    ))}
                </div>
           </div>
         </motion.div> {/* Ende motion.div */}
      </div> {/* Ende Haupt-Container */}

      {/* Comments Sheet (unverändert) */}
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
    </>
  );
}