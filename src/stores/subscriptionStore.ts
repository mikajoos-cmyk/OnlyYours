// src/stores/subscriptionStore.ts
import { create } from 'zustand';
import { subscriptionService, Subscription } from '../services/subscriptionService';
import type { Post } from '../services/postService';
import { useAuthStore } from './authStore';
import { paymentService } from '../services/paymentService';
import { Tier } from '../services/tierService';

interface SubscriptionState {
  subscriptions: Subscription[];
  subscriptionMap: Map<string, Subscription>;
  purchasedPostIds: Set<string>;
  isLoading: boolean;
  loadSubscriptions: () => Promise<void>;
  // Erweiterte Signatur für checkAccess
  checkAccess: (post: Post, currentUserId: string | undefined, creatorTiers?: Tier[]) => boolean;
  addPurchasedPost: (postId: string) => void;
  clearSubscriptions: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  subscriptionMap: new Map(),
  purchasedPostIds: new Set(),
  isLoading: true,

  loadSubscriptions: async () => {
    set({ isLoading: true });
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ isLoading: false, subscriptions: [], subscriptionMap: new Map(), purchasedPostIds: new Set() });
      return;
    }

    try {
      const [subs, ppvIds] = await Promise.all([
        subscriptionService.getUserSubscriptions(),
        paymentService.getPaidPostIds(userId)
      ]);

      const subMap = new Map(subs.map(sub => [sub.creatorId, sub]));

      set({
        subscriptions: subs,
        subscriptionMap: subMap,
        purchasedPostIds: ppvIds,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load subscriptions or paid posts:', error);
      set({ isLoading: false, subscriptions: [], subscriptionMap: new Map(), purchasedPostIds: new Set() });
    }
  },

  /**
   * Prüft den Zugriff auf einen Post.
   * Berücksichtigt: Eigene Posts, PPV-Kauf, Abo-Status und Abo-Preishierarchie.
   */
  checkAccess: (post: Post, currentUserId: string | undefined, creatorTiers?: Tier[]) => {
    const state = get();

    // 1. Eigene Posts sind immer sichtbar
    if (post.creatorId === currentUserId && currentUserId !== undefined) {
      return true;
    }

    // 2. Öffentliche Posts (kostenlos und kein Tier)
    if (post.price === 0 && post.tier_id === null) {
      return true;
    }

    // 3. Per PPV gekauft
    if (state.purchasedPostIds.has(post.id)) {
      return true;
    }

    // 4. Abo prüfen
    const activeSub = state.subscriptionMap.get(post.creatorId);
    if (activeSub) {
      const isActive = activeSub.status === 'ACTIVE' ||
                       (activeSub.status === 'CANCELED' && activeSub.endDate && new Date(activeSub.endDate) > new Date());

      if (isActive) {
        // 4a. Post ist für "Alle Abonnenten"
        if (post.tier_id === null) {
          return true;
        }

        // 4b. Exakter Tier-Match
        if (post.tier_id === activeSub.tierId) {
          return true;
        }

        // 4c. HIERARCHIE-CHECK:
        // Ist das aktuelle Abo teurer oder gleich teuer wie das benötigte Tier?
        if (creatorTiers && creatorTiers.length > 0) {
            const requiredTier = creatorTiers.find(t => t.id === post.tier_id);

            // Falls wir das Tier in der Liste finden und unser Abo-Preis >= Tier-Preis ist
            if (requiredTier && activeSub.price >= requiredTier.price) {
                return true;
            }
        }
      }
    }

    // 5. Kein Zugriff
    return false;
  },

  addPurchasedPost: (postId: string) => {
    set(state => ({
      purchasedPostIds: new Set(state.purchasedPostIds).add(postId)
    }));
  },

  clearSubscriptions: () => {
    set({
      subscriptions: [],
      subscriptionMap: new Map(),
      purchasedPostIds: new Set(),
      isLoading: false
    });
  }
}));