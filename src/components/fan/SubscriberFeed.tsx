// src/components/fan/SubscriberFeed.tsx
import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFeedStore } from '../../stores/feedStore'; // Importiere den FeedStore
import type { Post as ServicePostData } from '../../services/postService'; // Importiere den Post-Typ vom Service

// Interface für CreatorInfo (kann bleiben oder aus Service importiert werden)
interface CreatorInfo {
  name: string;
  avatar: string;
  username: string; // Wird für Navigation benötigt
  isVerified?: boolean;
}

// Interface für PostData anpassen, um dem ServicePostData-Typ besser zu entsprechen
// oder ServicePostData direkt verwenden
interface PostData extends Omit<ServicePostData, 'creatorId' | 'creator'> {
  media: string; // Behalte 'media' für Konsistenz mit bestehendem Code ODER refactor zu mediaUrl
  creator: CreatorInfo; // Verwende das vereinfachte CreatorInfo
}


interface SubscriberFeedProps {
  initialPosts?: PostData[] | ServicePostData[]; // Kann beide Typen akzeptieren
  initialIndex?: number;
  isProfileView?: boolean;
  onClose?: () => void;
}

export default function SubscriberFeed({
  initialPosts: initialPostsProp, // Umbenannt, um Konflikt mit State zu vermeiden
  initialIndex = 0,
  isProfileView = false,
  onClose
}: SubscriberFeedProps) {
  const navigate = useNavigate();

  // Zustand aus dem Store holen
  const {
    posts: storePosts,
    currentIndex: storeCurrentIndex,
    isLoading: storeIsLoading,
    loadSubscriberPosts,
    nextPost: nextPostAction,
    previousPost: previousPostAction,
    toggleLike: toggleLikeAction
  } = useFeedStore();

  // Lokaler State für Posts und Index, abhängig davon, ob es die Profilansicht ist
  const [posts, setPosts] = useState<ServicePostData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(!isProfileView); // Ladezustand nur im Feed-Modus initial true

  // Lokaler State für Likes (kann entfernt werden, wenn Store verwendet wird)
  // const [isLiked, setIsLiked] = useState<{ [key: string]: boolean }>({});
  // const [likes, setLikes] = useState<{ [key: string]: number }>({});

  const [showComments, setShowComments] = useState(false);
  const [selectedPostIdForComments, setSelectedPostIdForComments] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Daten laden oder aus Props übernehmen
  useEffect(() => {
    if (isProfileView && initialPostsProp) {
        // Transformiere initialPostsProp, falls nötig, um ServicePostData zu entsprechen
        const transformedPosts = initialPostsProp.map(p => ({
            ...p,
            mediaUrl: (p as PostData).media || (p as ServicePostData).mediaUrl, // Passe media/mediaUrl an
        }));
      setPosts(transformedPosts as ServicePostData[]);
      setCurrentIndex(initialIndex);
      setIsLoading(false); // Keine Ladeanzeige bei Props
    } else if (!isProfileView) {
      loadSubscriberPosts(); // Lade Daten über den Store für den Feed
    }
  }, [isProfileView, initialPostsProp, initialIndex, loadSubscriberPosts]);

  // Store-Daten in lokalen State spiegeln (nur für Feed-Ansicht)
  useEffect(() => {
    if (!isProfileView) {
      setPosts(storePosts);
      setCurrentIndex(storeCurrentIndex);
      setIsLoading(storeIsLoading);
    }
  }, [isProfileView, storePosts, storeCurrentIndex, storeIsLoading]);


  // ----- Scrolling/Swiping Logic (Funktionen aus Store verwenden) -----
   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isProfileView) { // Tastaturnavigation nur im normalen Feed
        if (e.key === 'ArrowDown') {
            nextPostAction(); // Store-Aktion verwenden
        } else if (e.key === 'ArrowUp') {
            previousPostAction(); // Store-Aktion verwenden
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileView, nextPostAction, previousPostAction]); // Store-Aktionen als Abhängigkeiten

  const scrollThreshold = 50;

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold || posts.length <= 1) return;
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
      if (posts.length <= 1) return;
      const touch = e.touches[0];
      const deltaY = handleTouchStart.current.y - touch.clientY;

      if (Math.abs(deltaY) > 50 && !isScrolling.current) {
        isScrolling.current = true;

        if (deltaY > 0 && currentIndex < posts.length - 1) {
            if (isProfileView) setCurrentIndex(i => i + 1); else nextPostAction();
        } else if (deltaY < 0 && currentIndex > 0) {
             if (isProfileView) setCurrentIndex(i => i - 1); else previousPostAction();
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

  // Like-Handler (Store-Aktion verwenden)
  const handleLike = async (postId: string) => {
      if (isProfileView) {
          // TODO: Implementiere lokale Like-Logik für Profilansicht ODER erweitere den Store
          console.warn("Like-Funktion im Profil-Viewer noch nicht implementiert.");
      } else {
         await toggleLikeAction(postId); // Store-Aktion aufrufen
      }
  };

  const handleCommentClick = (postId: string) => {
    setSelectedPostIdForComments(postId);
    setShowComments(true);
  };

  // --- Aktuellen Post bestimmen ---
  const currentPost = posts[currentIndex];

  // --- Ladezustand oder "Keine Posts" ---
  if (isLoading && !isProfileView) {
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
            <p className="text-muted-foreground">Post nicht gefunden oder Ladefehler.</p>
        </div>
     );
  } else if (!currentPost && !isLoading) { // Nur anzeigen, wenn nicht mehr geladen wird
      return (
        <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
            <p className="text-muted-foreground">Keine abonnierten Posts zum Anzeigen.</p>
        </div>
     );
  }
   // Fallback, wenn currentPost noch undefiniert ist während des Ladens
  if (!currentPost) {
      return null; // Oder eine minimale Ladeanzeige
  }


  // --- JSX (bleibt größtenteils gleich, verwendet jetzt `currentPost` aus dem State/Store) ---
  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "w-full overflow-hidden relative bg-background",
          isProfileView
            ? "fixed top-16 left-0 right-0 bottom-16 z-40 md:left-64 md:bottom-0 md:h-[calc(100vh-4rem)]"
            : "h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]"
        )}
        onWheel={handleScroll}
        onTouchStart={handleTouchStartCapture}
        onTouchMove={handleTouchMove}
      >
         {/* Schließen-Button */}
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

        {/* Motion Div für Übergänge */}
        <motion.div
           key={currentPost.id} // Verwende die Post-ID als Key
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.3 }}
           className="h-full w-full relative"
         >
            {/* Bild/Video */}
            {/* --- NEU: Bedingtes Rendern für Video/Bild --- */}
            {currentPost.mediaType === 'video' ? (
              <video
                src={currentPost.mediaUrl}
                autoPlay
                muted // WICHTIG: Autoplay funktioniert in Browsern nur ohne Ton
                loop
                playsInline // Wichtig für iOS-Geräte
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={currentPost.mediaUrl}
                alt={currentPost.caption}
                className="w-full h-full object-cover"
              />
            )}
            {/* --- ENDE --- */}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

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
                                @{currentPost.creatorId}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Icons rechts */}
            <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-6 md:bottom-8">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleLike(currentPost.id)}
                    className="flex flex-col items-center gap-1"
                >
                    <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                        <HeartIcon
                        // Verwende isLiked direkt aus dem aktuellen Post-Objekt (vom Store oder Prop)
                        className={`w-7 h-7 ${
                            currentPost.isLiked ? 'fill-secondary text-secondary' : 'text-foreground'
                        }`}
                        strokeWidth={1.5}
                        />
                    </div>
                    <span className="text-sm font-medium text-foreground drop-shadow-lg">
                        {/* Verwende likes direkt aus dem aktuellen Post-Objekt */}
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
            // Finde den Post anhand der ID aus dem aktuellen `posts`-State
            post={posts.find(p => p.id === selectedPostIdForComments)}
          />
        )}
      </AnimatePresence>
    </>
  );
}