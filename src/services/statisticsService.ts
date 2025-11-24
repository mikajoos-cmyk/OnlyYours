// src/services/statisticsService.ts
import { supabase } from '../lib/supabase';

// --- Datentypen für die Statistiken ---

// Neue Typ-Definition für Zeiträume
export type TimeRange = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';

// Für Linien-/Balkendiagramme
export interface MonthlyStatData {
  month: string; // z.B. "Jan", "Feb" oder Datum "01.01"
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
   * Ruft die Umsatzdaten für einen bestimmten Zeitraum ab.
   * Wir übergeben den 'period_input' an die RPC-Funktion.
   */
  async getRevenueData(creatorId: string, range: TimeRange = '6m'): Promise<MonthlyStatData[]> {
    // Hinweis: Die RPC-Funktion 'get_revenue_stats' muss in der DB existieren und den Parameter 'period_input' akzeptieren.
    // Falls sie noch 'get_monthly_revenue' heißt, muss sie ggf. angepasst werden.
    const { data, error } = await supabase.rpc('get_monthly_revenue', {
      creator_id_input: creatorId,
      period_input: range // Neuer Parameter
    });

    if (error) {
      console.error('Error fetching revenue data:', error);
      // Fallback: Leeres Array zurückgeben, damit die UI nicht crasht
      return [];
    }

    return (data || []).map((item: any) => ({
      month: item.month_abbr || item.date_label, // Flexibel für Monat oder Datum
      value: item.total_revenue,
    }));
  }

  /**
   * Ruft die Abonnenten-Wachstumsdaten für einen bestimmten Zeitraum ab.
   */
  async getSubscriberGrowth(creatorId: string, range: TimeRange = '6m'): Promise<MonthlyStatData[]> {
    const { data, error } = await supabase.rpc('get_monthly_subscriber_growth', {
      creator_id_input: creatorId,
      period_input: range // Neuer Parameter
    });

     if (error) {
      console.error('Error fetching subscriber growth:', error);
      return [];
    }

     return (data || []).map((item: any) => ({
      month: item.month_abbr || item.date_label,
      value: item.new_subscribers,
    }));
  }

  /**
   * Ruft die Top-Fans (meiste Ausgaben) ab.
   * Auch hier könnte man theoretisch nach Zeitraum filtern (optional).
   */
  async getTopFans(creatorId: string, limit: number = 5, range: TimeRange = 'all'): Promise<TopFan[]> {
    const { data, error } = await supabase.rpc('get_top_fans', {
      creator_id_input: creatorId,
      limit_input: limit,
      period_input: range
    });

    if (error) {
      console.error('Error fetching top fans:', error);
      return [];
    }

    return (data || []).map((fan: any) => ({
        id: fan.fan_id,
        name: fan.display_name,
        avatar: fan.avatar_url,
        spent: fan.total_spent,
    }));
  }

  /**
   * Ruft grundlegende Engagement-Statistiken ab.
   * Hier filtern wir client-seitig oder passen die Query an.
   */
  async getEngagementStats(creatorId: string, range: TimeRange = 'all'): Promise<EngagementStats> {
    let query = supabase
      .from('posts')
      .select('likes_count, comments_count, created_at', { count: 'exact' })
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      .or(`scheduled_for.is.null,scheduled_for.lte.now()`);

    // Einfacher Datumsfilter für die Query
    if (range !== 'all') {
        const now = new Date();
        let pastDate = new Date();

        switch (range) {
            case '7d': pastDate.setDate(now.getDate() - 7); break;
            case '30d': pastDate.setDate(now.getDate() - 30); break;
            case '3m': pastDate.setMonth(now.getMonth() - 3); break;
            case '6m': pastDate.setMonth(now.getMonth() - 6); break;
            case '1y': pastDate.setFullYear(now.getFullYear() - 1); break;
        }

        query = query.gte('created_at', pastDate.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching engagement stats:', error);
      return { avgLikes: 0, avgComments: 0, totalPosts: 0 };
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