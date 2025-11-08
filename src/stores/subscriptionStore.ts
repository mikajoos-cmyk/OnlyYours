// src/stores/subscriptionStore.ts
import { create } from 'zustand';
import { subscriptionService, Subscription } from '../services/subscriptionService';
import type { Post } from '../services/postService'; // Import Post-Typ
import { useAuthStore } from './authStore'; // <-- 1. Import authStore
import { paymentService } from '../services/paymentService'; // <-- 2. Import paymentService

// Definiert, was im Store gespeichert wird
interface SubscriptionState {
  subscriptions: Subscription[];
  subscriptionMap: Map<string, Subscription>; // creatorId -> Subscription
  purchasedPostIds: Set<string>; // Set von Post-IDs, die per PPV gekauft wurden
  isLoading: boolean;
  loadSubscriptions: () => Promise<void>;
  checkAccess: (post: Post, currentUserId: string | undefined) => boolean;
  addPurchasedPost: (postId: string) => void;
  clearSubscriptions: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  subscriptionMap: new Map(),
  purchasedPostIds: new Set(),
  isLoading: true,

  /**
   * Lädt die Abonnements UND gekaufte Posts des aktuellen Benutzers.
   */
  loadSubscriptions: async () => {
    set({ isLoading: true });

    // --- KORREKTUR START: User-ID holen ---
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      console.warn("[subscriptionStore] loadSubscriptions called without user. Aborting.");
      set({ isLoading: false, subscriptions: [], subscriptionMap: new Map(), purchasedPostIds: new Set() });
      return;
    }
    // --- KORREKTUR ENDE ---

    try {
      // --- KORREKTUR START: Lade Abos UND PPV-Käufe parallel ---
      const [subs, ppvIds] = await Promise.all([
        subscriptionService.getUserSubscriptions(),
        paymentService.getPaidPostIds(userId)
      ]);
      // --- KORREKTUR ENDE ---

      const subMap = new Map(subs.map(sub => [sub.creatorId, sub]));

      set({
        subscriptions: subs,
        subscriptionMap: subMap,
        purchasedPostIds: ppvIds, // <-- KORREKTUR: Gekaufte Posts hier laden
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load subscriptions or paid posts:', error);
      set({ isLoading: false, subscriptions: [], subscriptionMap: new Map(), purchasedPostIds: new Set() });
    }
  },

  /**
   * Prüft client-seitig, ob der Benutzer Zugriff auf einen Post hat.
   */
  checkAccess: (post: Post, currentUserId: string | undefined) => {
    const state = get();

    // 1. Eigene Posts sind immer sichtbar
    if (post.creatorId === currentUserId && currentUserId !== undefined) {
      return true;
    }

    // 2. Echte öffentliche Posts (kostenlos UND kein Tier) sind immer sichtbar
    if (post.price === 0 && post.tier_id === null) {
      return true;
    }

    // 3. (JETZT PERSISTENT) Prüfen, ob der Post per PPV gekauft wurde
    if (state.purchasedPostIds.has(post.id)) {
      return true;
    }

    // 4. Prüfen, ob der Benutzer ein gültiges Abo hat
    const activeSub = state.subscriptionMap.get(post.creatorId);
    if (activeSub) {
      // Prüfen, ob das Abo noch aktiv ist (nicht nur 'CANCELED')
      const isActive = activeSub.status === 'ACTIVE' ||
                       (activeSub.status === 'CANCELED' && activeSub.endDate && new Date(activeSub.endDate) > new Date());

      if (isActive) {
        // 4a. Post ist für "Alle Abonnenten" (keine Tier-ID)
        if (post.tier_id === null) {
          return true;
        }
        // 4b. Post ist für ein bestimmtes Tier
        if (post.tier_id === activeSub.tierId) {
          return true;
        }
      }
    }

    // 5. Kein Zugriff (Post ist gesperrt / PPV)
    return false;
  },

  /**
   * Fügt eine Post-ID hinzu, nachdem sie per PPV gekauft wurde.
   * (Wird für die optimistische Anzeige bis zum nächsten Reload genutzt)
   */
  addPurchasedPost: (postId: string) => {
    set(state => ({
      purchasedPostIds: new Set(state.purchasedPostIds).add(postId)
    }));
  },

  /**
   * Leert die Abos beim Logout.
   */
  clearSubscriptions: () => {
    set({
      subscriptions: [],
      subscriptionMap: new Map(),
      purchasedPostIds: new Set(),
      isLoading: false
    });
  }
}));