import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export interface PaymentTransaction {
  id: string;
  created_at: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

// UPDATE: Generisches Interface für alle Methoden
export interface SavedPaymentMethod {
  id: string;
  type: string;        // 'card', 'sepa_debit', 'paypal', etc.
  label: string;       // z.B. "**** 4242" oder "DE89...332"
  subLabel?: string;   // z.B. "Expires 12/24" oder "Mandat: XYZ"
  icon?: string;       // Brand icon string (visa, mastercard, etc.)
  isDefault: boolean;
}

export class PaymentService {

  async getUserPaymentHistory(userId: string, limit: number = 20): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((payment: any) => ({
      id: payment.id,
      created_at: payment.created_at,
      amount: payment.amount,
      status: payment.status,
      description: this.generatePaymentDescription(payment),
    }));
  }

  async getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'GET',
    });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
    return data?.methods || [];
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'DELETE',
      body: { paymentMethodId }
    });
    if (error) throw error;
  }

  async chargeSavedCard(
    paymentMethodId: string,
    amount: number,
    metadata: any
  ): Promise<void> {
    const { data, error } = await supabase.functions.invoke('charge-saved-card', {
      body: {
        paymentMethodId,
        amount,
        metadata
      }
    });

    if (error) throw new Error(error.message || "Verbindung fehlgeschlagen");
    if (data?.error) throw new Error(data.error);
  }

  async getPaidPostIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('payments')
      .select('related_id')
      .eq('user_id', userId)
      .eq('type', 'PAY_PER_VIEW')
      .eq('status', 'SUCCESS')
      .not('related_id', 'is', null);

    if (error) return new Set<string>();

    const ids = (data || []).map((p: any) => p.related_id).filter((id: string | null): id is string => id !== null);
    return new Set<string>(ids);
  }

  private generatePaymentDescription(payment: any): string {
    const meta = payment.metadata || {};
    if (payment.type === 'SUBSCRIPTION') return `Abo: ${meta.creatorName || 'Creator'}`;
    if (payment.type === 'TIP') return `Tip: ${meta.creatorName || 'Creator'}`;
    if (payment.type === 'PAY_PER_VIEW') return `PPV: ${meta.postCaption || 'Inhalt'}`;
    if (payment.type === 'PRODUCT') return `Kauf: ${meta.productTitle || 'Produkt'}`;
    return 'Zahlung';
  }
}

export const paymentService = new PaymentService();