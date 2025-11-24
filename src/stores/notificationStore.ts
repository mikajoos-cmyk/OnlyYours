// src/stores/notificationStore.ts
import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from './authStore'; // Import für userId
import type { Database } from '../lib/database.types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

interface NotificationState {
  unreadCount: number;
  recentNotifications: NotificationRow[];
  pollingInterval: NodeJS.Timeout | null;

  // Aktionen
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (userId: string) => Promise<void>;
  removeNotification: (notificationId: string) => Promise<void>; // <-- NEU
  startPolling: (userId: string) => void;
  stopPolling: () => void;
}

const POLLING_RATE = 30000; // 30 Sekunden

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  recentNotifications: [],
  pollingInterval: null,

  /**
   * Holt die neuesten Benachrichtigungen und die Anzahl ungelesener.
   */
  fetchNotifications: async (userId: string) => {
    try {
      const [count, recent] = await Promise.all([
        notificationService.getUnreadNotificationCount(userId),
        notificationService.getRecentNotifications(userId, 5)
      ]);
      set({ unreadCount: count, recentNotifications: recent });
    } catch (error) {
      console.error("Fehler beim Abrufen der Benachrichtigungen:", error);
    }
  },

  /**
   * Markiert alle als gelesen und aktualisiert den Zähler.
   */
  markAsRead: async (userId: string) => {
    // Optimistisches Update: Zähler sofort auf 0 setzen
    set(state => ({
      unreadCount: 0,
      recentNotifications: state.recentNotifications.map(n => ({ ...n, is_read: true }))
    }));

    try {
      await notificationService.markAllAsRead(userId);
    } catch (error) {
      console.error("Fehler beim Markieren als gelesen:", error);
      get().fetchNotifications(userId); // Rollback bei Fehler
    }
  },

  // --- NEUE AKTION: LÖSCHEN ---
  removeNotification: async (notificationId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    // 1. Optimistisches Update im Store
    set((state) => {
      // Prüfen, ob die gelöschte Nachricht ungelesen war, um den Zähler zu korrigieren
      const notification = state.recentNotifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.is_read;

      return {
        recentNotifications: state.recentNotifications.filter(n => n.id !== notificationId),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      };
    });

    // 2. API Aufruf
    try {
      await notificationService.deleteNotification(notificationId, userId);
    } catch (error) {
      // Bei Fehler Liste neu laden
      get().fetchNotifications(userId);
    }
  },
  // --- ENDE NEUE AKTION ---

  /**
   * Startet das Polling für Benachrichtigungen.
   */
  startPolling: (userId: string) => {
    get().stopPolling();
    get().fetchNotifications(userId);

    const interval = setInterval(() => {
      get().fetchNotifications(userId);
    }, POLLING_RATE);

    set({ pollingInterval: interval });
  },

  /**
   * Stoppt das Polling.
   */
  stopPolling: () => {
    const interval = get().pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ pollingInterval: null, unreadCount: 0, recentNotifications: [] });
    }
  },
}));