import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';
import { useNavigate } from 'react-router-dom';

export default function SubscriberFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState<{ [key: number]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const navigate = useNavigate();

  const posts = [
    {
      id: '1',
      creator: {
        name: 'Sophia Laurent',
        avatar: 'https://placehold.co/100x100',
        username: 'sophialaurent',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Exclusive content just for you! 💎',
      hashtags: ['exclusive', 'vip', 'premium'],
      likes: 3240,
      comments: 189,
    },
    {
      id: '2',
      creator: {
        name: 'Isabella Rose',
        avatar: 'https://placehold.co/100x100',
        username: 'isabellarose',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Thank you for your support! ❤️',
      hashtags: ['thankyou', 'subscribers', 'love'],
      likes: 2890,
      comments: 145,
    },
    {
      id: '3',
      creator: {
        name: 'Sophia Laurent',
        avatar: 'https://placehold.co/100x100',
        username: 'sophialaurent',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'New exclusive series starting! 🎬',
      hashtags: ['newseries', 'exclusive', 'comingsoon'],
      likes: 4120,
      comments: 267,
    },
    {
      id: '4',
      creator: {
        name: 'Isabella Rose',
        avatar: 'https://placehold.co/100x100',
        username: 'isabellarose',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'VIP access to my latest photoshoot 📸',
      hashtags: ['vip', 'photoshoot', 'exclusive'],
      likes: 3567,
      comments: 198,
    },
  ];

  useEffect(() => {
    const initialLikes: { [key: number]: number } = {};
    posts.forEach((post, index) => {
      initialLikes[index] = post.likes;
    });
    setLikes(initialLikes);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, posts.length - 1));
      } else if (e.key === 'ArrowUp') {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [posts.length, setCurrentIndex]);

  const scrollThreshold = 50; // Adjust this value as needed for sensitivity

  const handleScroll = (e: React.WheelEvent) => {
    if (isScrolling.current || Math.abs(e.deltaY) < scrollThreshold) return;

    isScrolling.current = true;
    
    if (e.deltaY > 0 && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setTimeout(() => {
      isScrolling.current = false;
    }, 800);
  };

  const handleTouchStart = useRef({ y: 0 });
  const handleTouchMove = (e: React.TouchEvent) => {
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

  const handleLike = (index: number) => {
    setIsLiked((prev) => ({ ...prev, [index]: !prev[index] }));
    setLikes((prev) => ({
      ...prev,
      [index]: prev[index] + (isLiked[index] ? -1 : 1),
    }));
  };

  const handleCommentClick = (index: number) => {
    setSelectedPostIndex(index);
    setShowComments(true);
  };

  const currentPost = posts[currentIndex];

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
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.5 }}
          className="h-full w-full relative"
        >
          <img
            src={currentPost.media}
            alt={currentPost.caption}
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

          <div className="absolute top-4 left-4 right-20 z-10">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${currentPost.creator.username}`)}>
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
                  @{currentPost.creator.username}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute right-4 bottom-32 z-10 flex flex-col gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleLike(currentIndex)}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                <HeartIcon
                  className={`w-7 h-7 ${
                    isLiked[currentIndex] ? 'fill-secondary text-secondary' : 'text-foreground'
                  }`}
                  strokeWidth={1.5}
                />
              </div>
              <span className="text-sm font-medium text-foreground drop-shadow-lg">
                {likes[currentIndex]?.toLocaleString() || 0}
              </span>
            </motion.button>

            <button
              onClick={() => handleCommentClick(currentIndex)}
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
        {selectedPostIndex !== null && showComments && (
          <CommentsSheet
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              setSelectedPostIndex(null);
            }}
            post={posts[selectedPostIndex]}
          />
        )}
      </AnimatePresence>
    </>
  );
}
