import { useState } from 'react';
import { HeartIcon, MessageCircleIcon, Share2Icon, DollarSignIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useFeedStore } from '../../stores/feedStore';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/badge';

interface Post {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    isVerified: boolean;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
}

interface MediaCardProps {
  post: Post;
}

export default function MediaCard({ post }: MediaCardProps) {
  const { toggleLike } = useFeedStore();
  const navigate = useNavigate();
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const handleLike = () => {
    toggleLike(post.id);
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 600);
  };

  return (
    <div className="relative w-full h-screen">
      <img
        src={post.mediaUrl}
        alt={post.caption}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      <div className="absolute top-8 left-4 flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${post.creator.username}`)}>
        <Avatar className="w-12 h-12 border-2 border-secondary">
          <AvatarImage src={post.creator.avatar} alt={post.creator.name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {post.creator.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-foreground font-medium">{post.creator.name}</span>
            {post.creator.isVerified && (
              <Badge className="bg-secondary text-secondary-foreground px-2 py-0 text-xs font-normal">
                Verifiziert
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-4 right-24 space-y-3">
        <p className="text-foreground text-base leading-relaxed">{post.caption}</p>
        <div className="flex flex-wrap gap-2">
          {post.hashtags.map((tag) => (
            <span key={tag} className="text-secondary text-sm">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 right-4 flex flex-col gap-6">
        <motion.button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={isLikeAnimating ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.6 }}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${post.isLiked ? 'bg-secondary' : 'bg-card'
              }`}
          >
            <HeartIcon
              className={`w-6 h-6 ${post.isLiked ? 'fill-secondary-foreground text-secondary-foreground' : 'text-foreground'
                }`}
              strokeWidth={1.5}
            />
          </motion.div>
          <span className="text-foreground text-sm">{post.likes}</span>
        </motion.button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
            <MessageCircleIcon className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          </div>
          <span className="text-foreground text-sm">{post.comments}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
            <Share2Icon className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          </div>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <DollarSignIcon className="w-6 h-6 text-secondary-foreground" strokeWidth={1.5} />
          </div>
          <span className="text-foreground text-sm">Tip</span>
        </button>
      </div>
    </div>
  );
}
