import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { HeartIcon, SendIcon, XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

export default function CommentsSheet({ isOpen, onClose, post }: CommentsSheetProps) {
  const [comment, setComment] = useState('');

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
    {
      id: '4',
      user: { name: 'Tom Fischer', avatar: 'https://placehold.co/100x100' },
      text: 'Großartige Arbeit! 👏',
      timestamp: 'vor 6 Std',
      likes: 18,
    },
    {
      id: '5',
      user: { name: 'Sarah Klein', avatar: 'https://placehold.co/100x100' },
      text: 'Ich liebe deinen Stil!',
      timestamp: 'vor 8 Std',
      likes: 32,
    },
  ];

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      setComment('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border max-h-[70vh] flex flex-col rounded-t-3xl z-50"
      >
        <div className="p-4 border-b border-border flex-shrink-0 flex items-center justify-between">
          <h3 className="text-foreground text-center font-medium flex-1">
            {post.comments} Kommentare
          </h3>
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="text-foreground hover:text-secondary hover:bg-neutral flex-shrink-0"
          >
            <XIcon className="w-5 h-5" strokeWidth={1.5} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
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

        <div className="p-4 border-t border-border flex-shrink-0 bg-card">
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
              size="icon"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal flex-shrink-0"
            >
              <SendIcon className="w-5 h-5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
