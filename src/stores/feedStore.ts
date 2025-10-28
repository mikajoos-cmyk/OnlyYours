import { create } from 'zustand';
import { postService } from '../services/postService';

interface Creator {
  id: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  bio: string;
  followers: number;
  subscriptionPrice: number;
}

interface Post {
  id: string;
  creatorId: string;
  creator: Creator;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
}

interface FeedState {
  posts: Post[];
  currentIndex: number;
  isLoading: boolean;
  loadDiscoveryPosts: () => Promise<void>;
  loadSubscriberPosts: () => Promise<void>;
  loadCreatorPosts: (creatorId: string) => Promise<void>;
  nextPost: () => void;
  previousPost: () => void;
  toggleLike: (postId: string) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  currentIndex: 0,
  isLoading: false,
  loadDiscoveryPosts: async () => {
    set({ isLoading: true });
    try {
      const posts = await postService.getDiscoveryFeed(20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error) {
      console.error('Failed to load discovery posts:', error);
      set({ isLoading: false });
    }
  },
  loadSubscriberPosts: async () => {
    set({ isLoading: true });
    try {
      const posts = await postService.getSubscriberFeed(20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error) {
      console.error('Failed to load subscriber posts:', error);
      set({ isLoading: false });
    }
  },
  loadCreatorPosts: async (creatorId: string) => {
    set({ isLoading: true });
    try {
      const posts = await postService.getCreatorPosts(creatorId, 20);
      set({ posts, currentIndex: 0, isLoading: false });
    } catch (error) {
      console.error('Failed to load creator posts:', error);
      set({ isLoading: false });
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
}));
