import { create } from 'zustand';

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
  loadPosts: () => void;
  nextPost: () => void;
  previousPost: () => void;
  toggleLike: (postId: string) => void;
}

const mockCreators: Creator[] = [
  {
    id: '1',
    name: 'Sophia Laurent',
    avatar: 'https://placehold.co/100x100',
    isVerified: true,
    bio: 'Fashion & Lifestyle Creator',
    followers: 125000,
    subscriptionPrice: 19.99,
  },
  {
    id: '2',
    name: 'Isabella Rose',
    avatar: 'https://placehold.co/100x100',
    isVerified: true,
    bio: 'Fitness & Wellness',
    followers: 98000,
    subscriptionPrice: 14.99,
  },
];

const mockPosts: Post[] = [
  {
    id: '1',
    creatorId: '1',
    creator: mockCreators[0],
    mediaUrl: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
    mediaType: 'image',
    caption: 'Exclusive behind the scenes from today\'s photoshoot ✨',
    hashtags: ['fashion', 'luxury', 'exclusive'],
    likes: 2340,
    comments: 156,
    isLiked: false,
  },
  {
    id: '2',
    creatorId: '2',
    creator: mockCreators[1],
    mediaUrl: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
    mediaType: 'image',
    caption: 'Morning routine secrets revealed 💫',
    hashtags: ['fitness', 'wellness', 'lifestyle'],
    likes: 1890,
    comments: 98,
    isLiked: false,
  },
];

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  currentIndex: 0,
  loadPosts: () => set({ posts: mockPosts }),
  nextPost: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.posts.length - 1),
    })),
  previousPost: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),
  toggleLike: (postId: string) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            }
          : post
      ),
    })),
}));
