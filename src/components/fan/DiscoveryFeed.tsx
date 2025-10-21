import { useState, useRef, useEffect } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import CommentsSheet from './CommentsSheet';

export default function DiscoveryFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState<{ [key: number]: boolean }>({});
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [showComments, setShowComments] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const posts = [
    {
      id: '1',
      creator: {
        name: 'Sophia Laurent',
        avatar: 'https://placehold.co/100x100',
        username: 'sophialaurent',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Exclusive behind the scenes ✨',
      hashtags: ['luxury', 'fashion', 'exclusive'],
      likes: 2340,
      comments: 156,
    },
    {
      id: '2',
      creator: {
        name: 'Isabella Rose',
        avatar: 'https://placehold.co/100x100',
        username: 'isabellarose',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Morning vibes 💫',
      hashtags: ['fitness', 'wellness', 'lifestyle'],
      likes: 1890,
      comments: 98,
    },
    {
      id: '3',
      creator: {
        name: 'Elena Noir',
        avatar: 'https://placehold.co/100x100',
        username: 'elenanoir',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'New collection preview 🌟',
      hashtags: ['fashion', 'style', 'premium'],
      likes: 3120,
      comments: 203,
    },
    {
      id: '4',
      creator: {
        name: 'Aria Gold',
        avatar: 'https://placehold.co/100x100',
        username: 'ariagold',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Behind the scenes magic 🎬',
      hashtags: ['vlog', 'behindthescenes', '4k'],
      likes: 2567,
      comments: 134,
    },
    {
      id: '5',
      creator: {
        name: 'Nova Sterling',
        avatar: 'https://placehold.co/100x100',
        username: 'novasterling',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Sunset dreams ☀️',
      hashtags: ['sunset', 'photography', 'aesthetic'],
      likes: 4230,
      comments: 287,
    },
    {
      id: '6',
      creator: {
        name: 'Luna Wilde',
        avatar: 'https://placehold.co/100x100',
        username: 'lunawilde',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Q&A time! Ask me anything 💬',
      hashtags: ['qanda', 'community', 'live'],
      likes: 1876,
      comments: 421,
    },
    {
      id: '7',
      creator: {
        name: 'Scarlett Vogue',
        avatar: 'https://placehold.co/100x100',
        username: 'scarlettvogue',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Fashion week highlights 👗',
      hashtags: ['fashionweek', 'runway', 'couture'],
      likes: 5432,
      comments: 312,
    },
    {
      id: '8',
      creator: {
        name: 'Jade Luxe',
        avatar: 'https://placehold.co/100x100',
        username: 'jadeluxe',
      },
      media: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      caption: 'Travel diaries: Paris edition 🗼',
      hashtags: ['travel', 'paris', 'luxury'],
      likes: 3890,
      comments: 245,
    },
  ];

  useEffect(() => {
    const initialLikes: { [key: number]: number } = {};
    posts.forEach((post, index) => {
      initialLikes[index] = post.likes;
    });
    setLikes(initialLikes);
  }, []);

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

          <div className="absolute bottom-4 right-4 z-10 text-foreground/60 text-sm drop-shadow-lg">
            {currentIndex + 1} / {posts.length}
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
