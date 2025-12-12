import { useMemo } from 'react';
import { SecureMedia } from '../ui/SecureMedia';
import type { Post as ServicePostData } from '../../services/postService';
import type { PostData as ViewerPostData } from './ProfilePostViewer';

// Vereinheitlichter Typ für Posts, da sie aus verschiedenen Quellen kommen können
interface CommonPost {
  id: string;
  mediaUrl: string | null;
  thumbnailUrl?: string | null;
  mediaType: 'image' | 'video' | 'IMAGE' | 'VIDEO';
  media?: string; // Fallback für ProfilePostViewer
}

interface FeedPreloaderProps {
  posts: (ServicePostData | ViewerPostData)[];
  currentIndex: number;
  preloadCount?: number;
}

export default function FeedPreloader({ posts, currentIndex, preloadCount = 2 }: FeedPreloaderProps) {
  // Wir berechnen die nächsten Indizes (inkl. Loop-Logik bei Bedarf, hier linear)
  const postsToPreload = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    
    const nextPosts: CommonPost[] = [];
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < posts.length) {
        // Normalisierung der Datenstruktur
        const p = posts[nextIndex];
        // @ts-ignore - Handle mixed types
        const url = p.mediaUrl || p.media || p.thumbnail_url;
        
        if (url) {
            nextPosts.push({
                id: p.id,
                mediaUrl: url,
                thumbnailUrl: p.thumbnail_url,
                mediaType: p.mediaType
            });
        }
      }
    }
    return nextPosts;
  }, [posts, currentIndex, preloadCount]);

  if (postsToPreload.length === 0) return null;

  return (
    <div className="hidden" aria-hidden="true">
      {postsToPreload.map((post) => (
        <SecureMedia
          key={`preload-${post.id}`}
          // Wir laden immer das Hauptmedium vor. 
          // Wenn es ein Video ist, lädt SecureMedia <video> tag. 
          // Der Browser entscheidet dann über Pufferung (preload="auto" ist default in SecureMedia oft).
          path={post.mediaUrl || ""}
          type={post.mediaType}
          // Priorität niedrig halten, damit der aktuelle Post Vorrang hat? 
          // Browser handhaben hidden elements oft automatisch mit niedrigerer Prio.
        />
      ))}
    </div>
  );
}