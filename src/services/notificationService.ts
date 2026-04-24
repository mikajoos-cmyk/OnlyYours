// src/services/notificationService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// Typ-Import aus den DB-Typen
type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export class NotificationService {

  /**
   * Ruft die ANZAHL der ungelesenen Benachrichtigungen für einen Benutzer ab.
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    if (!userId) return 0;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true }) // Zählt effizient
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread notification count:', error);
        return 0; // Rückfallwert statt Throw
      }
      return count || 0;
    } catch (e) {
      console.error('Network error fetching unread count:', e);
      return 0;
    }
  }

  /**
   * Ruft die neuesten Benachrichtigungen für einen Benutzer ab.
   */
  async getRecentNotifications(userId: string, limit: number = 5): Promise<NotificationRow[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) // Neueste zuerst
        .limit(limit);

      if (error) {
        console.error('Error fetching recent notifications:', error);
        return []; // Rückfallwert
      }
      return data || [];
    } catch (e) {
      console.error('Network error fetching recent notifications:', e);
      return [];
    }
  }

  /**
   * Markiert alle ungelesenen Benachrichtigungen eines Benutzers als gelesen.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // --- NEUE FUNKTION ---
  /**
   * Löscht eine einzelne Benachrichtigung.
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId); // Sicherheitscheck

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
  // --- ENDE NEUE FUNKTION ---
}

export const notificationService = new NotificationService();