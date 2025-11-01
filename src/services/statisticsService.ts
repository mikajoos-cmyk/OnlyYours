// src/services/statisticsService.ts
import { supabase } from '../lib/supabase';

// --- Datentypen für die Statistiken ---

// Für Linien-/Balkendiagramme
export interface MonthlyStatData {
  month: string; // z.B. "Jan", "Feb"
  value: number;
}

// Für Top Fans
export interface TopFan {
  id: string;
  name: string;
  avatar: string | null;
  spent: number; // Gesamtbetrag
}

// Für Engagement
export interface EngagementStats {
  avgLikes: number;
  avgComments: number;
  totalPosts: number;
}

export class StatisticsService {

  /**
   * Ruft die monatlichen Umsatzdaten für die letzten 6 Monate ab.
   * HINWEIS: Erfordert eine RPC-Funktion 'get_monthly_revenue' in Supabase.
   */
  async getRevenueData(creatorId: string): Promise<MonthlyStatData[]> {
    const { data, error } = await supabase.rpc('get_monthly_revenue', {
      creator_id_input: creatorId
    });

    if (error) {
      console.error('Error fetching revenue data:', error);
      throw error;
    }
    // Annahme: RPC gibt { month_abbr: 'Jan', total_revenue: 123.45 } zurück
    return (data || []).map((item: any) => ({
      month: item.month_abbr,
      value: item.total_revenue,
    }));
  }

  /**
   * Ruft die monatlichen Abonnenten-Wachstumsdaten ab.
   * HINWEIS: Erfordert eine RPC-Funktion 'get_monthly_subscriber_growth' in Supabase.
   */
  async getSubscriberGrowth(creatorId: string): Promise<MonthlyStatData[]> {
     const { data, error } = await supabase.rpc('get_monthly_subscriber_growth', {
      creator_id_input: creatorId
    });

     if (error) {
      console.error('Error fetching subscriber growth:', error);
      throw error;
    }
    // Annahme: RPC gibt { month_abbr: 'Jan', new_subscribers: 50 } zurück
     return (data || []).map((item: any) => ({
      month: item.month_abbr,
      value: item.new_subscribers,
    }));
  }

  /**
   * Ruft die Top-Fans (meiste Ausgaben) ab.
   * HINWEIS: Erfordert eine RPC-Funktion 'get_top_fans' in Supabase.
   */
  async getTopFans(creatorId: string, limit: number = 5): Promise<TopFan[]> {
    const { data, error } = await supabase.rpc('get_top_fans', {
      creator_id_input: creatorId,
      limit_input: limit
    });

    if (error) {
      console.error('Error fetching top fans:', error);
      throw error;
    }
     // Annahme: RPC gibt { fan_id, display_name, avatar_url, total_spent } zurück
    return (data || []).map((fan: any) => ({
        id: fan.fan_id,
        name: fan.display_name,
        avatar: fan.avatar_url,
        spent: fan.total_spent,
    }));
  }

  /**
   * Ruft grundlegende Engagement-Statistiken ab (Client-seitig).
   */
  async getEngagementStats(creatorId: string): Promise<EngagementStats> {
    const { data, error, count } = await supabase
      .from('posts')
      .select('likes_count, comments_count', { count: 'exact' })
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      // Nur Posts berücksichtigen, die nicht in der Zukunft liegen
      .or(`scheduled_for.is.null,scheduled_for.lte.now()`);


    if (error) {
      console.error('Error fetching engagement stats:', error);
      throw error;
    }

    const totalPosts = count || 0;
    if (totalPosts === 0) {
      return { avgLikes: 0, avgComments: 0, totalPosts: 0 };
    }

    const totalLikes = data.reduce((sum, post) => sum + post.likes_count, 0);
    const totalComments = data.reduce((sum, post) => sum + post.comments_count, 0);

    return {
      avgLikes: totalLikes / totalPosts,
      avgComments: totalComments / totalPosts,
      totalPosts: totalPosts,
    };
  }
}

export const statisticsService = new StatisticsService();