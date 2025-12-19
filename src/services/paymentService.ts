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

// NEU: Typ für gespeicherte Zahlungsmethoden
export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
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
      .limit(limit) as any;

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
   * Führt den Datenbank-Eintrag für einen Pay-Per-View-Kauf durch.
   * (Wird aufgerufen, nachdem die Zahlung via Stripe erfolgreich war)
   */
  async purchasePost(postId: string, creatorId: string, amount: number): Promise<PaymentRow> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Metadaten für die Transaktionshistorie abrufen
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

    const paymentData: any = {
      user_id: user.id,
      creator_id: creatorId,
      amount: amount,
      currency: 'EUR',
      type: 'PAY_PER_VIEW',
      status: 'SUCCESS',
      related_id: postId,
      metadata: {
        creatorName: (creator as any)?.display_name || 'Unbekannt',
        postCaption: (post as any)?.caption?.substring(0, 50) || 'Post'
      }
    };

    const { data: newPayment, error } = await (supabase.from('payments') as any)
      .insert(paymentData as any)
      .select()
      .single();

    if (error) {
      console.error('Error purchasing post:', error);
      throw error;
    }

    return newPayment;
  }

  /**
   * Führt den Datenbank-Eintrag für ein Trinkgeld durch.
   * (Wird aufgerufen, nachdem die Zahlung via Stripe erfolgreich war)
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

    const paymentData: any = {
      user_id: user.id,
      creator_id: creatorId,
      amount: amount,
      currency: 'EUR',
      type: 'TIP',
      status: 'SUCCESS',
      related_id: null,
      metadata: {
        creatorName: (creator as any)?.display_name || 'Unbekannt'
      }
    };

    const { data: newPayment, error } = await (supabase.from('payments') as any)
      .insert(paymentData as any)
      .select()
      .single();

    if (error) {
      console.error('Error sending tip:', error);
      throw error;
    }

    return newPayment;
  }

  /**
   * NEU: Führt den Datenbank-Eintrag für einen Produktkauf durch.
   */
  async purchaseProduct(creatorId: string, productId: string, amount: number, productTitle: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Eintrag in die payments Tabelle
    const { data, error } = await (supabase.from('payments') as any)
      .insert({
        user_id: user.id,
        creator_id: creatorId,
        amount: amount,
        currency: 'EUR',
        type: 'PRODUCT', // Nutzt den neuen ENUM Wert
        status: 'SUCCESS',
        related_id: productId, // Verknüpfung zum Produkt
        metadata: {
          productTitle: productTitle,
          description: `Kauf von: ${productTitle}`
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording product purchase:', error);
      throw new Error('Kauf konnte nicht registriert werden: ' + error.message);
    }

    return data;
  }


  /**
   * Ruft NUR die IDs aller erfolgreich gekauften PPV-Posts ab.
   * Hocheffizient für den App-Start zur Rechteprüfung.
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
      .map((p: any) => p.related_id)
      .filter((id: string | null): id is string => id !== null);

    return new Set<string>(ids);
  }

  // --- NEU: Methoden für Zahlungsverwaltung ---

  /**
   * Ruft die gespeicherten Zahlungsmethoden (Karten) über die Edge Function ab.
   */
  async getSavedPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'GET',
    });

    if (error) {
      console.error('Error fetching payment methods via Edge Function:', error);
      throw error;
    }
    // Die Edge Function gibt { methods: [...] } zurück
    return data.methods || [];
  }

  /**
   * Löscht eine gespeicherte Zahlungsmethode über die Edge Function.
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('manage-payment-methods', {
      method: 'DELETE',
      body: { paymentMethodId }
    });

    if (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Erzeugt eine lesbare Beschreibung für eine Transaktion.
   */
  private generatePaymentDescription(payment: PaymentRow): string {
    const metadata = payment.metadata as { creatorName?: string, postCaption?: string };

    try {
      switch (payment.type as any) {
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
        case 'PRODUCT':
          const productMeta = payment.metadata as { productTitle?: string };
          if (productMeta?.productTitle) {
            return `Kauf: ${productMeta.productTitle}`;
          }
          return 'Produktkauf';
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