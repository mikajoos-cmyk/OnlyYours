import { create } from 'zustand';
import { postService } from '../services/postService';
import type { Post as ServicePostData } from '../services/postService';

// Verwende den Service-Post-Typ
interface Post extends ServicePostData {}

interface FeedState {
  posts: Post[];
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  offset: number; // Neuer State für Paginierung
  hasMore: boolean; // Merker, ob es noch mehr gibt

  loadDiscoveryPosts: (reset?: boolean) => Promise<void>;
  loadSubscriberPosts: () => Promise<void>;
  loadCreatorPosts: (creatorId: string) => Promise<void>;
  nextPost: () => void;
  previousPost: () => void;
  toggleLike: (postId: string) => Promise<void>;
  incrementCommentCount: (postId: string) => void;
}

const PAGE_SIZE = 10; // Anzahl Posts pro Ladung

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
  offset: 0,
  hasMore: true,

  // Algorithmus-Feed laden (mit Loop-Logik)
  loadDiscoveryPosts: async (reset = false) => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true, error: null });

    // Bei Reset (z.B. erster Aufruf) alles zurücksetzen
    const currentOffset = reset ? 0 : state.offset;

    try {
      // 1. Neue Posts holen
      const newPosts = await postService.getDiscoveryFeed(PAGE_SIZE, currentOffset);

      if (newPosts.length > 0) {
        // Normaler Fall: Neue Posts gefunden
        set((state) => ({
          posts: reset ? newPosts : [...state.posts, ...newPosts],
          offset: currentOffset + PAGE_SIZE,
          currentIndex: reset ? 0 : state.currentIndex,
          isLoading: false,
          hasMore: true
        }));
      } else {
        // ENDE ERREICHT -> LOOP LOGIK
        // Wenn offset > 0 war (wir hatten schon Posts), fangen wir von vorne an
        if (currentOffset > 0) {
          console.log("Feed Ende erreicht - Starte von vorne (Loop)");

          // Wir holen sofort die ersten Posts (Seite 1) und hängen sie an
          const loopPosts = await postService.getDiscoveryFeed(PAGE_SIZE, 0);

          set((state) => ({
            posts: [...state.posts, ...loopPosts],
            offset: PAGE_SIZE, // Offset wieder auf Seite 2 setzen
            isLoading: false,
            hasMore: true
          }));
        } else {
          // Wirklich gar keine Posts im System
          set({ isLoading: false, hasMore: false });
        }
      }
    } catch (error: any) {
      console.error('Failed to load discovery posts:', error);
      set({ isLoading: false, error: error.message || 'Fehler beim Laden' });
    }
  },

  loadSubscriberPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const posts = await postService.getSubscriberFeed(50);
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

  // Logik für Infinite Scroll beim Swipen
  nextPost: () => {
    const { currentIndex, posts, loadDiscoveryPosts, isLoading } = get();

    // Nächster Index
    const nextIndex = currentIndex + 1;

    // Wenn wir uns dem Ende nähern (z.B. vorletzter Post), mehr laden
    if (nextIndex >= posts.length - 2 && !isLoading) {
      // Aber nur im Discovery Feed (wenn offset > 0 ist, ist es wahrscheinlich Discovery)
      // Eine robustere Prüfung wäre ein separater 'feedType' State, aber das reicht oft.
      loadDiscoveryPosts();
    }

    // Index erhöhen (max bis Ende)
    if (nextIndex < posts.length) {
      set({ currentIndex: nextIndex });
    }
  },

  previousPost: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  toggleLike: async (postId: string) => {
    const state = get();
    // Da wir Posts im Loop haben können (gleiche ID mehrfach), filtern wir alle Instanzen
    // Dies ist eine Vereinfachung. Besser wäre ein Map im UI.

    // Update für alle Vorkommen dieses Posts im Feed (falls geloopt)
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          const optimisticIsLiked = !p.isLiked;
          return {
            ...p,
            isLiked: optimisticIsLiked,
            likes: optimisticIsLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      }),
    }));

    try {
      await postService.toggleLike(postId);
    } catch (error) {
      // Rollback bei Fehler (auch für alle Instanzen)
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p.id === postId) {
            const revertedIsLiked = !p.isLiked; // zurückdrehen
            return {
              ...p,
              isLiked: revertedIsLiked,
              likes: revertedIsLiked ? p.likes + 1 : p.likes - 1,
            };
          }
          return p;
        }),
      }));
    }
  },

  incrementCommentCount: (postId: string) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments + 1 }
          : p
      ),
    })),
}));