import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

// --- Interface für Posts (ggf. anpassen/importieren) ---
interface CreatorInfo {
  name: string;
  avatar: string;
  username: string;
  isVerified?: boolean; // Hinzugefügt für MediaCard Kompatibilität
}

interface PostData {
  id: string;
  creator: CreatorInfo;
  media: string; // Wird als mediaUrl in MediaCard verwendet
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  mediaType: 'image' | 'video'; // Hinzugefügt für MediaCard
}
// --- Ende Interface ---


interface SubscriberFeedProps {
  initialPosts?: PostData[];
  initialIndex?: number;
  isProfileView?: boolean;
  onClose?: () => void;
}

export default function SubscriberFeed({
  initialPosts,
  initialIndex = 0,
  isProfileView = false,
  onClose
}: SubscriberFeedProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostData[]>(initialPosts || []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: string]: number }>({});
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Default-Posts (nur laden, wenn keine initialPosts übergeben wurden)
  const defaultPosts: PostData[] = [
      {
        id: 'sub1',
        creator: {
          name: 'Sophia Laurent',
          avatar: 'https://placehold.co/100x100',
          username: 'sophialaurent',
          isVerified: true,
        },
        media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
        mediaType: 'image',
        caption: 'Exclusive content just for you! 💎',
        hashtags: ['exclusive', 'vip', 'premium'],
        likes: 3240,
        comments: 189,
      },
      {
        id: 'sub2',
        creator: {
          name: 'Isabella Rose',
          avatar: 'https://placehold.co/100x100',
          username: 'isabellarose',
          isVerified: false,
        },
        media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
        mediaType: 'image',
        caption: 'Thank you for your support! ❤️',
        hashtags: ['thankyou', 'subscribers', 'love'],
        likes: 2890,
        comments: 145,
      },
      // ... weitere Default-Posts ...
    ];

  // Daten initialisieren oder laden
  useEffect(() => {
    let currentPosts = initialPosts || defaultPosts;
    setPosts(currentPosts);
    setCurrentIndex(initialIndex); // Setze Index *nachdem* Posts gesetzt wurden

    const initialLikesState: { [key: string]: number } = {};
    const initialIsLikedState: { [key: string]: boolean } = {};
    currentPosts.forEach((post) => {
        initialLikesState[post.id] = post.likes;
        initialIsLikedState[post.id] = post.isLiked || false;
    });
    setLikes(initialLikesState);
    setIsLiked(initialIsLikedState);

  }, [initialPosts, initialIndex]); // Nur diese Abhängigkeiten


  // ----- Scrolling/Swiping Logic -----
   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isProfileView) { // Tastaturnavigation nur im normalen Feed
        if (e.key === 'ArrowDown') {
          setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, posts.length - 1));
        } else if (e.key === 'ArrowUp') {
          setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posts.length, isProfileView]); // isProfileView hinzugefügt

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1) return;
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

        setTimeout(() => {
          isScrolling.current = false;
        }, 800);
      }
    };

    const handleTouchStartCapture = (e: React.TouchEvent) => {
      handleTouchStart.current = { y: e.touches[0].clientY };
    };
  // ----- Ende Scrolling/Swiping Logic -----

  const handleLike = (postId: string) => {
    setIsLiked((prev) => ({ ...prev, [postId]: !prev[postId] }));
    setLikes((prev) => {
        const currentLikes = prev[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0; // Fallback
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

  if (!currentPost && isProfileView) {
     return (
        <div className="fixed inset-0 top-16 z-40 bg-background flex items-center justify-center"> {/* top-16 hinzugefügt */}
            {onClose && <Button onClick={onClose} variant="ghost" size="icon" className="absolute top-4 right-4 z-50"><XIcon/></Button>}
            <p className="text-muted-foreground">Post nicht gefunden oder Ladefehler.</p>
        </div>
     );
  } else if (!currentPost) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
            <p className="text-muted-foreground">Keine Posts zum Anzeigen.</p>
        </div>
     );
  }


  // --- Daten für MediaCard vorbereiten ---
  // Wir müssen die Likes und isLiked aus dem State übergeben, da MediaCard seinen eigenen State hat
  const mediaCardPost = {
    ...currentPost,
    likes: likes[currentPost.id] ?? currentPost.likes,
    isLiked: isLiked[currentPost.id] ?? false,
    // MediaCard erwartet direkt mediaUrl und creatorId, nicht media und creator obj
    mediaUrl: currentPost.media,
    creatorId: currentPost.creator.username, // Oder eine ID, falls verfügbar
    // Das creator-Objekt in MediaCardProps wird auch benötigt
    creator: {
        id: currentPost.creator.username, // Verwende username als ID oder eine echte ID
        name: currentPost.creator.name,
        avatar: currentPost.creator.avatar,
        isVerified: currentPost.creator.isVerified || false,
    }
  };


  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "w-full overflow-hidden relative bg-background", // bg-background hinzugefügt
          isProfileView
            ? "fixed top-16 left-0 right-0 bottom-16 z-40 md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]" // top-16 statt inset-0, bottom-0 für Desktop
            : "h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]" // Normal im AppShell
        )}
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
         {/* Schließen-Button (Jetzt relativ zum Container positioniert) */}
        {isProfileView && onClose && (
           <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            // Z-Index muss höher sein als der von motion.div oder MediaCard intern
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
           >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
           </Button>
        )}

        {/* Motion Div für Übergänge */}
        <motion.div
           key={currentIndex}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.3 }}
           // Wichtig: h-full, damit MediaCard den Platz einnehmen kann
           className="h-full w-full"
         >
           {/* MediaCard übernimmt jetzt die Darstellung */}
           {/* Beachte: MediaCard erwartet andere Props als direkt hier gerendert */}
           {/* Wir müssen die onLike und onComment Logik an MediaCard übergeben oder die Icons hier neu rendern */}
           {/* Einfacher Ansatz: Rendere die Icons hier neu über der MediaCard */}

            <img
                src={mediaCardPost.mediaUrl}
                alt={mediaCardPost.caption}
                className="w-full h-full object-cover" // Passt sich an motion.div an
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

            {/* Creator Info (bleibt gleich) */}
            <div className="absolute top-4 left-4 right-20 z-10">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isProfileView && navigate(`/profile/${currentPost.creator.username}`)}>
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
                        {/* Username nur im Feed anzeigen */}
                        {!isProfileView && (
                            <p className="text-sm text-foreground/80 drop-shadow-lg">
                                @{currentPost.creator.username}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Icons rechts (neu gerendert, da MediaCard sie sonst intern hat) */}
            <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-6 md:bottom-8"> {/* Angepasster Abstand unten */}
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


            {/* Caption und Hashtags (bleibt gleich) */}
            <div className="absolute bottom-4 left-4 right-20 z-10 md:bottom-8"> {/* Angepasster Abstand unten */}
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
    </>
  );
}