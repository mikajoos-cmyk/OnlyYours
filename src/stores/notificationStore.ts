// src/stores/notificationStore.ts
import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { Database } from '../lib/database.types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

interface NotificationState {
  unreadCount: number;
  recentNotifications: NotificationRow[];
  pollingInterval: NodeJS.Timeout | null;

  // Aktionen
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (userId: string) => Promise<void>;
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
      // Markiere auch die im Dropdown sichtbaren als gelesen
      recentNotifications: state.recentNotifications.map(n => ({ ...n, is_read: true }))
    }));

    try {
      // API-Aufruf im Hintergrund
      await notificationService.markAllAsRead(userId);
      // (Der Zähler ist bereits auf 0)
    } catch (error) {
      console.error("Fehler beim Markieren als gelesen:", error);
      // Rollback (hole den echten Status erneut)
      get().fetchNotifications(userId);
    }
  },

  /**
   * Startet das Polling für Benachrichtigungen.
   */
  startPolling: (userId: string) => {
    // Stoppe altes Polling, falls vorhanden
    get().stopPolling();

    // Sofort einmal ausführen
    get().fetchNotifications(userId);

    // Polling starten
    const interval = setInterval(() => {
      console.log("[NotificationStore] Polling für neue Benachrichtigungen...");
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