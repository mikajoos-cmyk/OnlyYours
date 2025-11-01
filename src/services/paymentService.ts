// src/services/paymentService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];

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
    // WICHTIGER HINWEIS: 'metadata' wird hier verwendet.
    // Sie müssen sicherstellen, dass beim Erstellen der Zahlung (z.B. in subscriptionService)
    // nützliche Metadaten wie { creatorName: '...' } gespeichert werden.
    return data.map(payment => ({
      id: payment.id,
      created_at: payment.created_at,
      amount: payment.amount,
      status: payment.status,
      description: this.generatePaymentDescription(payment),
    }));
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
            return `PPV: ${metadata.postCaption.substring(0, 30)}...`;
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