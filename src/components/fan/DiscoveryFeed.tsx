// src/components/fan/DiscoveryFeed.tsx
import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, LockIcon, UserCheckIcon } from 'lucide-react'; // UserCheckIcon hinzugefügt
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFeedStore } from '../../stores/feedStore';
import ProfilePostViewer from './ProfilePostViewer';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
import { useToast } from '../../hooks/use-toast';
import { Separator } from '../ui/separator'; // Separator importieren
// --- NEUE IMPORTS ---
import { tierService, Tier } from '../../services/tierService';
import SubscriptionModal from './SubscriptionModal';
// --- ENDE ---

export default function DiscoveryFeed() {
  const [showComments, setShowComments] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [showPpvModal, setShowPpvModal] = useState(false);
  // --- NEUER STATE ---
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);
  // --- ENDE ---

  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Stores
  const { user } = useAuthStore(); // <-- KORREKTUR: Heißt 'user', nicht 'currentUser'
  const { posts, currentIndex, isLoading, error, loadDiscoveryPosts, nextPost, previousPost, toggleLike } = useFeedStore();
  const { checkAccess, addPurchasedPost, isLoading: isLoadingSubs, loadSubscriptions } = useSubscriptionStore(); // loadSubscriptions hinzugefügt

  // Daten laden
  useEffect(() => {
    if (posts.length === 0) {
      loadDiscoveryPosts();
    }
  }, [loadDiscoveryPosts, posts.length]);

  const currentPost = posts[currentIndex];

  // --- NEUER EFFEKT: Tiers für den aktuellen Creator laden ---
  useEffect(() => {
    if (!currentPost?.creatorId) {
      setCreatorTiers([]); // Zurücksetzen, wenn kein Post da ist
      return;
    }

    const fetchTiers = async () => {
      try {
        // Tiers für den Creator des aktuellen Posts abrufen
        const fetchedTiers = await tierService.getCreatorTiers(currentPost.creatorId);
        // Nach Preis sortieren, damit "ab X€" den günstigsten anzeigt
        const sortedTiers = (fetchedTiers || []).sort((a, b) => a.price - b.price);
        setCreatorTiers(sortedTiers);
      } catch (err) {
        console.error("Failed to fetch tiers for modal", err);
        setCreatorTiers([]); // Bei Fehler leeren
      }
    };
    fetchTiers();
  }, [currentPost?.creatorId]); // Abhängig von der Creator-ID des aktuellen Posts
  // --- ENDE ---


  // Tastatur-Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Modale blockieren Navigation
      if (showPpvModal || showComments || isViewerOpen || showSubscriptionModal) return;
      if (e.key === 'ArrowDown') nextPost();
      else if (e.key === 'ArrowUp') previousPost();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPost, previousPost, showPpvModal, showComments, isViewerOpen, showSubscriptionModal]);

  // Mausrad-Navigation
  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < 50 || showPpvModal || showComments || isViewerOpen || showSubscriptionModal) return;
    isScrolling.current = true;
    if (e.deltaY > 0) nextPost();
    else if (e.deltaY < 0) previousPost();
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  // Touch-Navigation
  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
    if (showPpvModal || showComments || isViewerOpen || showSubscriptionModal) return;
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

  // --- Klick-Handler für die Buttons im Overlay ---

  // Klick auf PPV-Button (öffnet PPV-Modal)
  const handlePpvClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindert Klick auf das Div
    setShowPpvModal(true);
  };

  // --- KORRIGIERTER HANDLER ---
  // Klick auf Abo-Button (öffnet Abo-Modal)
  const handleSubscribeClick = (e?: React.MouseEvent) => { // <-- 1. Event 'e' ist optional
    e?.stopPropagation(); // <-- 2. 'stopPropagation' nur aufrufen, WENN 'e' existiert

    if (!user) { // <-- 3. 'user' statt 'currentUser' verwenden
      toast({ title: "Bitte anmelden", description: "Sie müssen angemeldet sein.", variant: "destructive" });
      return;
    }
    if (creatorTiers.length === 0) {
       toast({ title: "Fehler", description: "Dieser Creator bietet (noch) keine Abos an.", variant: "destructive" });
       return;
    }

    // Schließe das PPV-Modal, falls es offen ist (z.B. wenn von dort geklickt)
    setShowPpvModal(false);
    // Öffne das SubscriptionModal
    setShowSubscriptionModal(true);
  };
  // --- ENDE KORREKTUR ---

  // Callback nach erfolgreichem PPV-Kauf
  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId); // Post optimistisch freischalten
    setShowPpvModal(false);
  };

  // Callback nach erfolgreichem Abo-Kauf
  const handleSubscriptionComplete = () => {
    setShowSubscriptionModal(false);
    toast({ title: "Erfolgreich abonniert!", description: "Der Post ist jetzt freigeschaltet." });
    // Wichtig: Der subscriptionStore muss neu geladen werden, damit checkAccess() funktioniert
    loadSubscriptions();
    // Der Post wird durch den re-render und checkAccess() automatisch freigeschaltet
  };


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

  // Optionen prüfen
  const canPpv = currentPost.price > 0;
  // Finde das spezifische Tier (falls vorhanden)
  const requiredTier = currentPost.tier_id ? creatorTiers.find(t => t.id === currentPost.tier_id) : null;
  // Finde das günstigste Tier (als Fallback)
  const cheapestTier = creatorTiers.length > 0 ? creatorTiers[0] : null; // Annahme: creatorTiers ist sortiert

  // Post ist an ein Tier gebunden ODER (ist ein allgemeiner Sub-Post UND der Creator hat Tiers)
  const canSubscribe = currentPost.tier_id !== null || (currentPost.tier_id === null && creatorTiers.length > 0);

  // --- Dynamischer Text für den Abo-Button im Overlay ---
  let subscribeText = "Mit Abo freischalten";
  if (requiredTier) {
    // Fall A: Post erfordert ein spezifisches Tier (z.B. "VIP")
    subscribeText = `Mit "${requiredTier.name}"-Abo freischalten`;
  } else if (cheapestTier) {
    // Fall B: Post ist für alle Abonnenten (tier_id = null), wir zeigen den günstigsten Preis an
    subscribeText = `Abonnieren (ab ${cheapestTier.price.toFixed(2)}€)`;
  } else {
    // Fall C: Creator hat keine Tiers (Button wird unten ausgeblendet)
    subscribeText = "Abonnieren nicht verfügbar";
  }
  // --- ENDE ---


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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full w-full relative bg-black"
        >
          {/* --- LOGIK FÜR VERPIXELTEN INHALT --- */}
          <div
            className="w-full h-full"
            onClick={() => { if(hasAccess) return; /* Nur klicken, wenn gesperrt */ }}
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

          {/* --- FIX: Overlay mit Schloss und Button-Auswahl --- */}
          {!hasAccess && (
            <div
              className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-default p-8"
            >
              <LockIcon className="w-16 h-16 text-foreground" />

              {/* Button 1: PPV (Immer anzeigen, wenn Preis > 0) */}
              {canPpv && (
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 w-full max-w-sm"
                  onClick={handlePpvClick}
                >
                  {`Beitrag für ${currentPost.price.toFixed(2)}€ freischalten`}
                </Button>
              )}

              {/* TRENNER */}
              {canPpv && canSubscribe && (
                 <div className="relative w-full max-w-sm">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      ODER
                    </span>
                  </div>
                </div>
              )}

              {/* Button 2: Abo (Immer anzeigen, wenn Tiers vorhanden) */}
              {canSubscribe && (
                <Button
                  variant={canPpv ? "outline" : "secondary"} // Wenn PPV da ist, ist Abo die "outline" Option
                  className={cn(
                      "text-lg px-8 py-6 w-full max-w-sm",
                      canPpv
                          ? "bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/90" // Wenn *nur* Abo geht
                  )}
                  onClick={handleSubscribeClick} // <-- ÖFFNET JETZT DAS ABO-MODAL
                >
                  <UserCheckIcon className="w-5 h-5 mr-2" />
                  {subscribeText}
                </Button>
              )}
            </div>
          )}
          {/* --- ENDE FIX --- */}


          {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

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
            <p className={cn(
                "text-foreground drop-shadow-lg mb-2",
                !hasAccess && "filter blur-sm select-none"
            )}>
              {hasAccess ? currentPost.caption : "Abonniere oder kaufe diesen Post, um die Beschreibung zu sehen."}
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

      {/* PPV Modal (wird durch handlePpvClick geöffnet) */}
      {showPpvModal && currentPost && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={currentPost}
            onPaymentSuccess={handlePurchaseSuccess}
            creatorTiers={creatorTiers} // <-- Übergibt die geladenen Tiers
            onSubscribeClick={handleSubscribeClick} // <-- Übergibt den Handler, der das Abo-Modal öffnet
         />
      )}

      {/* Subscription Modal (wird durch handleSubscribeClick geöffnet) */}
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