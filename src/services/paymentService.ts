import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export interface PaymentTransaction {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export class PaymentService {

  // ... (Bestehende Methoden getUserPaymentHistory, purchasePost, sendTip bleiben unverändert) ...

  async getUserPaymentHistory(userId: string, limit: number = 20): Promise<PaymentTransaction[]> {
    // ... (Unverändert lassen) ...
    const { data, error } = await supabase
      .from('payments')
      .select('id, created_at, amount, status, type, related_id, metadata, creator_id')
      .eq('user_id', userId)
      .eq('status', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(payment => ({
      id: payment.id,
      created_at: payment.created_at,
      amount: payment.amount,
      status: payment.status,
      description: this.generatePaymentDescription(payment as PaymentRow),
    }));
  }

  async purchasePost(postId: string, creatorId: string, amount: number): Promise<PaymentRow> {
     // ... (Unverändert lassen) ...
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) throw new Error('Not authenticated');
     // ... (Logik für Insert) ...
     const paymentData: PaymentInsert = {
       user_id: user.id,
       creator_id: creatorId,
       amount: amount,
       currency: 'EUR',
       type: 'PAY_PER_VIEW',
       status: 'SUCCESS',
       related_id: postId,
       metadata: {} // Vereinfacht
     };
     const { data, error } = await supabase.from('payments').insert(paymentData).select().single();
     if (error) throw error;
     return data;
  }

  async sendTip(creatorId: string, amount: number): Promise<PaymentRow> {
      // ... (Unverändert lassen) ...
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const paymentData: PaymentInsert = {
        user_id: user.id,
        creator_id: creatorId,
        amount: amount,
        currency: 'EUR',
        type: 'TIP',
        status: 'SUCCESS',
        related_id: null,
        metadata: {}
      };
      const { data, error } = await supabase.from('payments').insert(paymentData).select().single();
      if (error) throw error;
      return data;
  }

  async getPaidPostIds(userId: string): Promise<Set<string>> {
      // ... (Unverändert lassen) ...
      return new Set();
  }

  // --- NEUE METHODEN FÜR ZAHLUNGSVERWALTUNG ---

  /**
   * Ruft die gespeicherten Zahlungsmethoden (Karten) ab.
   */
  async getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'GET',
    });

    if (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
    return data.methods || [];
  }

  /**
   * Löscht eine gespeicherte Zahlungsmethode.
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'DELETE',
      body: { paymentMethodId }
    });

    if (error) throw error;
  }

  private generatePaymentDescription(payment: PaymentRow): string {
    // ... (Unverändert lassen) ...
    return "Transaktion";
  }
}

export const paymentService = new PaymentService();