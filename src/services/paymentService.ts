// src/services/paymentService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert']; // <-- HINZUGEFÜGT

// Ein Typ für die Transaktionshistorie im Frontend
export interface PaymentTransaction {
  id: string;
  created_at: string;
  description: string; // Wird aus 'type' und 'metadata' generiert
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

export class PaymentService {

  /**
   * Ruft die Zahlungshistorie für den aktuell angemeldeten Benutzer ab.
   */
  async getUserPaymentHistory(userId: string, limit: number = 20): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        created_at,
        amount,
        status,
        type,
        related_id,
        metadata
      `)
      .eq('user_id', userId)
      .eq('status', 'SUCCESS') // Nur erfolgreiche Transaktionen anzeigen
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Die Daten in ein Frontend-freundliches Format umwandeln
    return (data || []).map(payment => ({
      id: payment.id,
      created_at: payment.created_at,
      amount: payment.amount,
      status: payment.status,
      description: this.generatePaymentDescription(payment as PaymentRow),
    }));
  }

  // --- NEUE FUNKTION: purchasePost ---
  /**
   * Simuliert den Kauf eines Pay-Per-View-Posts.
   */
  async purchasePost(postId: string, creatorId: string, amount: number): Promise<PaymentRow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Metadaten für die Transaktionshistorie
    const { data: creator } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', creatorId)
        .single();

    const { data: post } = await supabase
        .from('posts')
        .select('caption')
        .eq('id', postId)
        .single();

    const paymentData: PaymentInsert = {
      user_id: user.id,
      amount: amount,
      currency: 'EUR',
      type: 'PAY_PER_VIEW',
      status: 'SUCCESS', // Simuliert eine erfolgreiche Zahlung
      related_id: postId,
      metadata: {
        creatorName: creator?.display_name || 'Unbekannt',
        postCaption: post?.caption?.substring(0, 50) || 'Post'
      }
    };

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      console.error('Error purchasing post:', error);
      throw error;
    }

    return newPayment;
  }
  // --- ENDE NEUE FUNKTION ---

  /**
   * Erzeugt eine lesbare Beschreibung für eine Transaktion.
   */
  private generatePaymentDescription(payment: PaymentRow): string {
    const metadata = payment.metadata as { creatorName?: string, postCaption?: string };

    try {
      switch (payment.type) {
        case 'SUBSCRIPTION':
          if (metadata?.creatorName) {
            return `Abonnement: ${metadata.creatorName}`;
          }
          return 'Abonnement-Zahlung';
        case 'PAY_PER_VIEW':
           // --- AKTUALISIERT ---
          if (metadata?.postCaption) {
            return `PPV: ${metadata.postCaption}...`;
          }
          return 'Pay-Per-View-Inhalt';
        case 'TIP':
          if (metadata?.creatorName) {
            return `Trinkgeld für: ${metadata.creatorName}`;
          }
          return 'Trinkgeld';
        default:
          return 'Unbekannte Transaktion';
      }
    } catch (e) {
      console.error("Fehler beim Parsen der Payment-Metadaten:", e);
      return "Transaktion";
    }
  }
}

export const paymentService = new PaymentService();