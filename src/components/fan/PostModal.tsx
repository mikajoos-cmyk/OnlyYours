import { useState, useEffect } from 'react';
// import { Dialog, DialogContent } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  creator: {
    id: string;
    name: string;
    avatar: string;
    username: string;
  };
  allPosts: any[];
}

export default function PostModal({ isOpen, onClose, post: initialPost, creator, allPosts }: PostModalProps) {
const navigate = useNavigate();
//   const [currentPostIndex, setCurrentPostIndex] = useState(allPosts.findIndex(p => p.id === initialPost.id));
//   const [isLiked, setIsLiked] = useState(false);
//   const [likes, setLikes] = useState(initialPost.likes);
const [currentPostIndex, setCurrentPostIndex] = useState(0);
const [isLiked, setIsLiked] = useState(false);
const [likes, setLikes] = useState(0);
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);

useEffect(() => {
  if (isOpen && initialPost) {
    const newIndex = allPosts.findIndex(p => p.id === initialPost.id);
    if (newIndex !== -1) {
      setCurrentPostIndex(newIndex);
      setIsLiked(allPosts[newIndex].isLiked || false);
      setLikes(allPosts[newIndex].likes || 0);
      setShowComments(false);
    }
  }
}, [isOpen, initialPost, allPosts]);

  const comments = [
    {
      id: '1',
      user: { name: 'Anna Schmidt', avatar: 'https://placehold.co/100x100' },
      text: 'Wow, das sieht fantastisch aus! 😍',
      timestamp: 'vor 2 Std',
      likes: 24,
    },
    {
      id: '2',
      user: { name: 'Max Müller', avatar: 'https://placehold.co/100x100' },
      text: 'Wo kann ich das kaufen?',
      timestamp: 'vor 3 Std',
      likes: 12,
    },
    {
      id: '3',
      user: { name: 'Lisa Weber', avatar: 'https://placehold.co/100x100' },
      text: 'Absolut inspirierend! 💫',
      timestamp: 'vor 5 Std',
      likes: 45,
    },
  ];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handlePrevious = () => {
    if (currentPostIndex > 0) {
      setCurrentPostIndex(currentPostIndex - 1);
      setIsLiked(false);
      setLikes(allPosts[currentPostIndex - 1].likes);
      setShowComments(false);
    }
  };

  const handleNext = () => {
    if (currentPostIndex < allPosts.length - 1) {
      setCurrentPostIndex(currentPostIndex + 1);
      setIsLiked(false);
      setLikes(allPosts[currentPostIndex + 1].likes);
      setShowComments(false);
    }
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      setComment('');
    }
  };
  const currentPost = allPosts[currentPostIndex];

if (!isOpen || !currentPost) {
  return null;
}
  return (
    <div className="fixed inset-0 top-16 z-40 bg-background md:left-64 pb-16 md:pb-0">        <div className="relative w-full h-full overflow-hidden bg-background rounded-lg max-w-7xl mx-auto">
          {/* Background Image */}
          <img
            src={currentPost.thumbnail}
            alt={currentPost.caption}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

          {/* Close Button */}
          <Button
            onClick={onClose}
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
          >
            <XIcon className="w-6 h-6" strokeWidth={1.5} />
          </Button>

          {/* Navigation Arrows */}
          {currentPostIndex > 0 && (
            <Button
              onClick={handlePrevious}
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
            >
              <ChevronLeftIcon className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          )}
          {currentPostIndex < allPosts.length - 1 && (
            <Button
              onClick={handleNext}
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 text-foreground hover:bg-black/70 rounded-full"
            >
              <ChevronRightIcon className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          )}

          {/* Creator Info */}
          <AnimatePresence>
            {!showComments && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-4 right-20 z-10"
              >
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${creator.username}`)}>
                  <Avatar className="w-12 h-12 border-2 border-foreground">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground drop-shadow-lg">
                      {creator.name}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <AnimatePresence>
            {!showComments && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-4 bottom-32 z-10 flex flex-col gap-6"
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLike}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                    <HeartIcon
                      className={`w-7 h-7 ${
                        isLiked ? 'fill-secondary text-secondary' : 'text-foreground'
                      }`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground drop-shadow-lg">
                    {likes.toLocaleString()}
                  </span>
                </motion.button>

                <button
                  onClick={() => setShowComments(!showComments)}
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption */}
          <AnimatePresence>
            {!showComments && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 left-4 right-20 z-10"
              >
                <p className="text-foreground drop-shadow-lg mb-2">{currentPost.caption}</p>
                <div className="flex flex-wrap gap-2">
                  {currentPost.hashtags.map((tag: string) => (
                    <span key={tag} className="text-secondary text-sm drop-shadow-lg">
                      #{tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border max-h-[70vh] flex flex-col rounded-t-3xl"
              >
                <div className="p-4 border-b border-border flex-shrink-0 flex items-center justify-between">
                  <h3 className="text-foreground text-center font-medium flex-1">
                    {currentPost.comments} Kommentare
                  </h3>
                  <Button
                    onClick={() => setShowComments(false)}
                    size="icon"
                    variant="ghost"
                    className="text-foreground hover:text-secondary hover:bg-neutral flex-shrink-0"
                  >
                    <XIcon className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {comment.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium text-sm">
                                {comment.user.name}
                              </p>
                              <p className="text-foreground text-sm mt-1 break-words">
                                {comment.text}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {comment.timestamp}
                                </span>
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  {comment.likes} Likes
                                </button>
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  Antworten
                                </button>
                              </div>
                            </div>
                            <button className="text-muted-foreground hover:text-secondary flex-shrink-0">
                              <HeartIcon className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-border bg-card flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Kommentar hinzufügen..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                      className="bg-background text-foreground border-border flex-1"
                    />
                    <Button
                      onClick={handleCommentSubmit}
                      disabled={!comment.trim()}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    >
                      Posten
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  );
}
