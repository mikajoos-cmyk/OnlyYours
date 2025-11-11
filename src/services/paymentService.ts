// src/services/paymentService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

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
        metadata,
        creator_id
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
      creator_id: creatorId, // Wichtig für Einnahmen-Trigger
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

  // --- NEUE FUNKTION: sendTip ---
  /**
   * Simuliert das Senden eines Trinkgelds an einen Creator.
   */
  async sendTip(creatorId: string, amount: number): Promise<PaymentRow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === creatorId) {
      throw new Error('Cannot send tip to yourself');
    }

    // Metadaten für die Transaktionshistorie
    const { data: creator } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', creatorId)
      .single();

    const paymentData: PaymentInsert = {
      user_id: user.id,
      creator_id: creatorId, // Wichtig für Einnahmen-Trigger
      amount: amount,
      currency: 'EUR',
      type: 'TIP', // Setzt den Typ auf TIP
      status: 'SUCCESS', // Simuliert eine erfolgreiche Zahlung
      related_id: null, // Kein spezifischer Post
      metadata: {
        creatorName: creator?.display_name || 'Unbekannt'
      }
    };

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      console.error('Error sending tip:', error);
      throw error;
    }

    return newPayment;
  }
  // --- ENDE NEUE FUNKTION ---


  /**
   * Ruft NUR die IDs aller erfolgreich gekauften PPV-Posts ab.
   * Hocheffizient für den App-Start.
   */
  async getPaidPostIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('payments')
      .select('related_id')
      .eq('user_id', userId)
      .eq('type', 'PAY_PER_VIEW')
      .eq('status', 'SUCCESS')
      .not('related_id', 'is', null);

    if (error) {
      console.error('Error fetching paid post IDs:', error);
      return new Set<string>();
    }

    const ids = (data || [])
      .map(p => p.related_id)
      .filter((id): id is string => id !== null);

    return new Set<string>(ids);
  }


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