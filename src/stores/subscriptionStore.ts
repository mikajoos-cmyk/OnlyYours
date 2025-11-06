// src/stores/subscriptionStore.ts
import { create } from 'zustand';
import { subscriptionService, Subscription } from '../services/subscriptionService';
import type { Post } from '../services/postService'; // Import Post-Typ

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
   * Lädt die Abonnements des aktuellen Benutzers.
   */
  loadSubscriptions: async () => {
    set({ isLoading: true });
    try {
      const subs = await subscriptionService.getUserSubscriptions();
      const subMap = new Map(subs.map(sub => [sub.creatorId, sub]));

      // PPV-Käufe laden (nur IDs)
      // HINWEIS: Für Performance sollte dies eine dedizierte RPC-Funktion sein,
      // die nur IDs zurückgibt. Hier verwenden wir den paymentService.
      // const payments = await paymentService.getUserPaymentHistory(userId);
      // const ppvIds = new Set(payments
      //     .filter(p => p.type === 'PAY_PER_VIEW' && p.related_id)
      //     .map(p => p.related_id!)
      // );

      // Vorerst leeres PPV-Set, da RLS dies jetzt serverseitig prüft
      // und wir den Status (hasAccess) client-seitig nur *optimistisch* (nach Kauf) aktualisieren.

      set({
        subscriptions: subs,
        subscriptionMap: subMap,
        isLoading: false,
        // purchasedPostIds: ppvIds
      });
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
      set({ isLoading: false, subscriptions: [], subscriptionMap: new Map() });
    }
  },

  /**
   * Prüft client-seitig, ob der Benutzer Zugriff auf einen Post hat.
   */
  checkAccess: (post: Post, currentUserId: string | undefined) => {
    const state = get();

    // 1. Eigene Posts sind immer sichtbar
    if (post.creatorId === currentUserId) {
      return true;
    }

    // 2. Öffentliche Posts (kostenlos) sind immer sichtbar
    if (post.price === 0) {
      return true;
    }

    // 3. (Optimistisch) Prüfen, ob der Post gerade per PPV gekauft wurde
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