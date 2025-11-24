import { create } from 'zustand';
import { postService } from '../services/postService';
import type { Post as ServicePostData } from '../services/postService';

// Verwende den Service-Post-Typ (der jetzt price/tier_id enthält)
interface Post extends ServicePostData {}

interface FeedState {
  posts: Post[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  loadDiscoveryPosts: () => Promise<void>;
  loadSubscriberPosts: () => Promise<void>;
  loadCreatorPosts: (creatorId: string) => Promise<void>;
  nextPost: () => void;
  previousPost: () => void;
  toggleLike: (postId: string) => Promise<void>;
  // NEU: Aktion zum Erhöhen des Kommentar-Zählers
  incrementCommentCount: (postId: string) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  loadDiscoveryPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const posts = await postService.getDiscoveryFeed(20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load discovery posts:', error);
      set({ isLoading: false, error: error.message || 'Fehler beim Laden' });
    }
  },
  loadSubscriberPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const posts = await postService.getSubscriberFeed(20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load subscriber posts:', error);
      set({ isLoading: false, error: error.message || 'Fehler beim Laden' });
    }
  },
  loadCreatorPosts: async (creatorId: string) => {
    set({ isLoading: true, error: null });
    try {
      const posts = await postService.getCreatorPosts(creatorId, 20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load creator posts:', error);
      set({ isLoading: false, error: error.message || 'Fehler beim Laden' });
    }
  },
  nextPost: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.posts.length - 1),
    })),
  previousPost: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),
  toggleLike: async (postId: string) => {
    const state = get();
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const optimisticIsLiked = !post.isLiked;
    const optimisticLikes = optimisticIsLiked ? post.likes + 1 : post.likes - 1;

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: optimisticIsLiked,
              likes: optimisticLikes,
            }
          : p
      ),
    }));

    try {
      await postService.toggleLike(postId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Rollback
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: post.isLiked,
                likes: post.likes,
              }
            : p
        ),
      }));
    }
  },
  // NEU: Implementierung
  incrementCommentCount: (postId: string) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments + 1 }
          : p
      ),
    })),
}));