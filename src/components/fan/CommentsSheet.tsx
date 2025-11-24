import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SendIcon, XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { commentService, Comment } from '../../services/commentService';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  // NEU: Callback für erfolgreichen Kommentar
  onCommentAdded?: () => void;
}

export default function CommentsSheet({ isOpen, onClose, post, onCommentAdded }: CommentsSheetProps) {
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { toast } = useToast();

  const fetchComments = async () => {
    if (!post?.id) return;
    setIsLoading(true);
    try {
      const fetchedComments = await commentService.getPostComments(post.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Fehler beim Laden der Kommentare:", error);
      toast({
        title: "Fehler",
        description: "Kommentare konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && post?.id) {
      fetchComments();
    } else {
      setComments([]);
    }
  }, [isOpen, post?.id]);

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || !post?.id || !currentUser) return;

    try {
      const newCommentData = await commentService.addComment(post.id, commentInput.trim());

      const newComment: Comment = {
        id: newCommentData.id,
        postId: newCommentData.post_id,
        userId: newCommentData.user_id,
        content: newCommentData.content,
        createdAt: newCommentData.created_at,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          isVerified: currentUser.isVerified || false,
        },
      };

      setComments(prevComments => [...prevComments, newComment]);
      setCommentInput('');

      // NEU: Callback aufrufen, um Zähler im Parent zu aktualisieren
      if (onCommentAdded) {
        onCommentAdded();
      }

    } catch (error) {
      console.error("Fehler beim Senden des Kommentars:", error);
      toast({
        title: "Fehler",
        description: "Kommentar konnte nicht gesendet werden.",
        variant: "destructive",
      });
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
        className="fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 bg-card/95 backdrop-blur-md border-t border-border max-h-[70vh] flex flex-col rounded-t-3xl z-50"
      >
        <div className="p-4 border-b border-border flex-shrink-0 flex items-center justify-between">
          <h3 className="text-foreground text-center font-medium flex-1">
            {isLoading ? 'Lade Kommentare...' : `${comments.length} Kommentar${comments.length !== 1 ? 'e' : ''}`}
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

        <div className="flex-1 overflow-y-auto p-4 chat-messages-scrollbar">
          {isLoading ? (
             <p className="text-center text-muted-foreground">Lade...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground">Noch keine Kommentare.</p>
          ) : (
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
                          {comment.user.isVerified && <span className="ml-1 text-secondary">*</span>}
                        </p>
                        <p className="text-foreground text-sm mt-1 break-words">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex-shrink-0 bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Kommentar hinzufügen..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
              className="bg-background text-foreground border-border flex-1"
              disabled={!currentUser}
            />
            <Button
              onClick={handleCommentSubmit}
              disabled={!commentInput.trim() || !currentUser}
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