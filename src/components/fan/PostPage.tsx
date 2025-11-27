// src/components/fan/PostPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, LockIcon, UserCheckIcon, ArrowLeftIcon, FlagIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { cn } from '../../lib/utils';
import { postService, Post as ServicePostData } from '../../services/postService';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import PpvModal from './PpvModal';
import { useToast } from '../../hooks/use-toast';
import { tierService, Tier } from '../../services/tierService';
import SubscriptionModal from './SubscriptionModal';
import TipModal from './TipModal';
import ReportModal from './ReportModal'; // <-- NEU
import { SecureMedia } from '../ui/SecureMedia';

type PostData = ServicePostData;

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user } = useAuthStore();
  const { checkAccess, addPurchasedPost, loadSubscriptions, isLoading: isLoadingSubs } = useSubscriptionStore();

  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatorTiers, setCreatorTiers] = useState<Tier[]>([]);

  const [showComments, setShowComments] = useState(false);
  const [showPpvModal, setShowPpvModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // <-- NEU

  useEffect(() => {
    if (!postId) {
      setError('Keine Post-ID gefunden.');
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPost = await postService.getPostById(postId);
        if (!fetchedPost) {
          setError('Post nicht gefunden oder nicht verfügbar.');
        } else {
          setPost(fetchedPost);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Posts:", err);
        setError('Post konnte nicht geladen werden.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!post?.creatorId) {
      setCreatorTiers([]);
      return;
    }
    const fetchTiers = async () => {
      try {
        const fetchedTiers = await tierService.getCreatorTiers(post.creatorId);
        const sortedTiers = (fetchedTiers || []).sort((a, b) => a.price - b.price);
        setCreatorTiers(sortedTiers);
      } catch (err) {
        console.error("Failed to fetch tiers for modal", err);
        setCreatorTiers([]);
      }
    };
    fetchTiers();
  }, [post?.creatorId]);

  const handleLike = async (postId: string) => {
    if (!post) return;
    const optimisticIsLiked = !post.isLiked;
    const optimisticLikes = optimisticIsLiked ? post.likes + 1 : post.likes - 1;
    setPost({ ...post, isLiked: optimisticIsLiked, likes: optimisticLikes });

    try {
      await postService.toggleLike(postId);
    } catch (error) {
      setPost({ ...post, isLiked: !optimisticIsLiked, likes: !optimisticIsLiked ? optimisticLikes - 1 : optimisticLikes + 1 });
      toast({ title: "Fehler", description: "Like konnte nicht gespeichert werden.", variant: "destructive" });
    }
  };

  const handleCommentClick = (postId: string) => {
    setShowComments(true);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link kopiert!', description: 'Der Link zum Post wurde in die Zwischenablage kopiert.' });
    }, (err) => {
      toast({ title: 'Fehler', description: 'Link konnte nicht kopiert werden.', variant: 'destructive' });
    });
  };

  const handleShare = async (postId: string, creatorUsername: string, creatorName: string) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    const shareText = `Schau dir diesen Post von ${creatorName} auf OnlyYours an!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `OnlyYours - ${creatorName}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const handleTipClick = (e: React.MouseEvent, creator: PostData['creator']) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Bitte anmelden", description: "Sie müssen angemeldet sein.", variant: "destructive" });
      return;
    }
    setShowTipModal(true);
  };

  const handlePpvClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPpvModal(true);
  };

  const handleSubscribeClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast({ title: "Bitte anmelden", description: "Sie müssen angemeldet sein.", variant: "destructive" });
      return;
    }
    if (creatorTiers.length === 0) {
       toast({ title: "Fehler", description: "Dieser Creator bietet (noch) keine Abos an.", variant: "destructive" });
       return;
    }
    setShowPpvModal(false);
    setShowSubscriptionModal(true);
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
        toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein, um Inhalte zu melden.", variant: "destructive" });
        return;
    }
    setShowReportModal(true);
  };

  const handlePurchaseSuccess = (postId: string) => {
    addPurchasedPost(postId);
    setShowPpvModal(false);
    if (post) setPost({ ...post, price: 0 });
  };

  const handleSubscriptionComplete = () => {
    setShowSubscriptionModal(false);
    toast({ title: "Erfolgreich abonniert!", description: "Der Post ist jetzt freigeschaltet." });
    loadSubscriptions();
    if (post) setPost({ ...post, tier_id: null });
  };

  const handleTipSuccess = () => {
    console.log("Tip success!");
  };

  if (isLoading || isLoadingSubs) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-foreground">Lade Post...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => navigate('/discover')} variant="outline">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Zurück zur Entdecken-Seite
        </Button>
      </div>
    );
  }
  if (!post) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <p className="text-foreground">Post nicht gefunden.</p>
      </div>
    );
  }

  // WICHTIG: Auch hier creatorTiers übergeben
  const hasAccess = checkAccess(post, user?.id, creatorTiers);

  const canPpv = post.price > 0;
  const requiredTier = post.tier_id ? creatorTiers.find(t => t.id === post.tier_id) : null;
  const cheapestTier = creatorTiers.length > 0 ? creatorTiers[0] : null;
  const canSubscribe = post.tier_id !== null || (post.tier_id === null && creatorTiers.length > 0);

  let subscribeText = "Mit Abo freischalten";
  if (requiredTier) {
    subscribeText = `Mit "${requiredTier.name}"-Abo freischalten`;
  } else if (cheapestTier) {
    subscribeText = `Abonnieren (ab ${cheapestTier.price.toFixed(2)}€)`;
  } else {
    subscribeText = "Abonnieren nicht verfügbar";
  }

  return (
    <>
      <div className="w-full overflow-hidden relative h-[calc(100vh-144px)] md:h-[calc(100vh-64px)]">
        <div className="h-full w-full relative bg-black">
          <div className="w-full h-full">
            <SecureMedia
  path={hasAccess ? post.mediaUrl : (post.thumbnail_url || post.mediaUrl)}
  type={post.mediaType}
  alt={post.caption || ""}
  className={cn(
    "w-full h-full",
    !hasAccess && "filter blur-2xl"
  )}
  autoPlay
  muted
  loop
  playsInline
/>
          </div>

          {!hasAccess && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4 cursor-default p-8">
              <LockIcon className="w-16 h-16 text-foreground" />
              {canPpv && (
                <Button
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 py-6 w-full max-w-sm"
                  onClick={handlePpvClick}
                >
                  {`Beitrag für ${post.price.toFixed(2)}€ freischalten`}
                </Button>
              )}
              {canPpv && canSubscribe && (
                 <div className="relative w-full max-w-sm">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">ODER</span></div>
                </div>
              )}
              {canSubscribe && (
                <Button
                  variant={canPpv ? "outline" : "secondary"}
                  className={cn(
                      "text-lg px-8 py-6 w-full max-w-sm",
                      canPpv
                          ? "bg-transparent border-secondary text-secondary hover:bg-secondary/10 hover:text-secondary"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  )}
                  onClick={handleSubscribeClick}
                >
                  <UserCheckIcon className="w-5 h-5 mr-2" />
                  {subscribeText}
                </Button>
              )}
            </div>
          )}

          {hasAccess && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />}

          <div className="absolute top-4 left-4 right-20 z-10">
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="bg-black/50 text-foreground hover:bg-black/70 rounded-full mr-2">
                <ArrowLeftIcon className="w-6 h-6" />
              </Button>
              <Link to={`/profile/${post.creator.username || post.creatorId}`} className="flex items-center gap-3 cursor-pointer">
                <Avatar className="w-12 h-12 border-2 border-foreground">
                  <AvatarImage src={post.creator.avatar} alt={post.creator.name} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {post.creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground drop-shadow-lg">
                    {post.creator.name}
                  </p>
                  <p className="text-sm text-foreground/80 drop-shadow-lg">
                    @{post.creator.username || post.creatorId}
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => hasAccess && handleLike(post.id)}
              className="flex flex-col items-center gap-1"
              disabled={!hasAccess}
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <HeartIcon
                  className={cn(
                    "w-7 h-7",
                    post.isLiked ? 'fill-secondary text-secondary' : 'text-foreground',
                    !hasAccess && "opacity-50"
                  )}
                  strokeWidth={1.5}
                />
              </div>
              <span className={cn("text-sm font-medium text-foreground drop-shadow-lg", !hasAccess && "opacity-50")}>
                {post.likes?.toLocaleString() || 0}
              </span>
            </motion.button>

            <button
              onClick={() => handleCommentClick(post.id)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <MessageCircleIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-foreground drop-shadow-lg">
                {post.comments}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(post.id, post.creator.username || post.creatorId, post.creator.name);
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <Share2Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
              </div>
            </button>

            <button
              onClick={(e) => handleTipClick(e, post.creator)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <DollarSignIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
              </div>
            </button>

            {/* --- NEU: REPORT BUTTON --- */}
            <button
              onClick={handleReportClick}
              className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            >
               <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                 <FlagIcon className="w-4 h-4 text-foreground" strokeWidth={1.5} />
               </div>
            </button>
            {/* --- ENDE --- */}
          </div>

          <div className="absolute bottom-4 left-4 right-20 z-10">
            <p className={cn(
                "text-foreground drop-shadow-lg mb-2",
                !hasAccess && "filter blur-sm select-none"
            )}>
              {hasAccess ? post.caption : "Abonniere oder kaufe diesen Post, um die Beschreibung zu sehen."}
            </p>
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <span key={tag} className="text-secondary text-sm drop-shadow-lg">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => setShowComments(false)}
            post={post}
          />
        )}
      </AnimatePresence>

      {showPpvModal && (
         <PpvModal
            isOpen={showPpvModal}
            onClose={() => setShowPpvModal(false)}
            post={post}
            onPaymentSuccess={handlePurchaseSuccess}
            creatorTiers={creatorTiers}
            onSubscribeClick={handleSubscribeClick}
         />
      )}

      {showSubscriptionModal && creatorTiers.length > 0 && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creator={{
            id: post.creatorId,
            name: post.creator.name,
          }}
          tiers={creatorTiers}
          onSubscriptionComplete={handleSubscriptionComplete}
        />
      )}

      {showTipModal && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creator={{ id: post.creator.id, name: post.creator.name }}
          onTipSuccess={handleTipSuccess}
        />
      )}

      {/* --- NEU: Report Modal --- */}
      {post && showReportModal && (
        <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            postId={post.id}
        />
      )}
    </>
  );
}