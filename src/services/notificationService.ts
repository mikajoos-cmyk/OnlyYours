import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// Typ-Import aus den DB-Typen
type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export class NotificationService {

  /**
   * Ruft die ANZAHL der ungelesenen Benachrichtigungen für einen Benutzer ab.
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true }) // Zählt effizient
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread notification count:', error);
      throw error;
    }
    return count || 0;
  }

  /**
   * Ruft die neuesten Benachrichtigungen für einen Benutzer ab.
   */
  async getRecentNotifications(userId: string, limit: number = 3): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) // Neueste zuerst
      .limit(limit);

    if (error) {
      console.error('Error fetching recent notifications:', error);
      throw error;
    }
    return data || [];
  }
}

export const notificationService = new NotificationService();