// src/services/payoutService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// Typen aus der Datenbank
type PayoutRow = Database['public']['Tables']['payouts']['Row'];

// Frontend-freundlicher Typ für die Payout-Historie
export interface PayoutTransaction {
  id: string;
  date: string; // ISO String
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

// Typ für die Zusammenfassungs-Daten
export interface PayoutSummary {
  availableBalance: number;
  nextPayoutDate: string; // Dieses Datum wird client-seitig generiert
  currentMonthEarnings: number;
  lastMonthComparison: number;
  totalYearEarnings: number;
}


export class PayoutService {

  /**
   * Ruft eine Zusammenfassung der Finanzdaten des Creators ab.
   * Verwendet die RPC-Funktion 'get_payout_summary'.
   */
  async getPayoutSummary(creatorId: string): Promise<PayoutSummary> {
    const { data, error } = await supabase
      .rpc('get_payout_summary', { creator_id_input: creatorId })
      .single();

    if (error) {
      console.error('Error fetching payout summary:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Could not fetch payout summary.');
    }

    // Nächstes Auszahlungsdatum client-seitig bestimmen (z.B. 1. des nächsten Monats)
    const now = new Date();
    const nextPayoutRaw = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextPayoutDate = nextPayoutRaw.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return {
      availableBalance: data.available_balance || 0,
      currentMonthEarnings: data.current_month_earnings || 0,
      lastMonthComparison: data.last_month_comparison_percent || 0,
      totalYearEarnings: data.total_year_earnings || 0,
      nextPayoutDate: nextPayoutDate
    };
  }

  /**
   * Ruft die Auszahlungshistorie eines Creators ab.
   */
  async getPayoutHistory(creatorId: string, limit: number = 10): Promise<PayoutTransaction[]> {
    const { data, error } = await supabase
      .from('payouts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching payout history:', error);
      throw error;
    }

    return (data || []).map(this.mapToPayoutTransaction);
  }

  /**
   * Fordert eine Auszahlung für den Creator an.
   * Verwendet die RPC-Funktion 'request_payout'.
   */
  async requestPayout(creatorId: string, amount: number): Promise<PayoutRow> {
     const { data, error } = await supabase
      .rpc('request_payout', {
        creator_id_input: creatorId,
        amount_input: amount
      })
      .single();

     if (error) {
        console.error('Error requesting payout:', error);
        throw error;
     }

     if (!data) {
        throw new Error('Payout request failed.');
     }

     return data;
  }

  // Interne Mapping-Funktion
  private mapToPayoutTransaction(row: PayoutRow): PayoutTransaction {
    return {
      id: row.id,
      date: row.requested_at,
      amount: row.amount,
      status: row.status,
    };
  }
}

export const payoutService = new PayoutService();