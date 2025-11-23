// src/services/subscriptionService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { messageService } from './messageService';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export interface Subscription {
  id: string;
  fanId: string;
  creatorId: string;
  tierId: string | null;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
  price: number;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  creator?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
}

export class SubscriptionService {

  /**
   * Erstellt oder aktualisiert ein Abonnement.
   * @param creatorId Die ID des Creators
   * @param tierId Die ID der Abo-Stufe (null für Basis)
   * @param price Der reguläre monatliche Preis des neuen Abos
   * @param amountPaid (Optional) Der tatsächlich sofort gezahlte Betrag (z.B. Differenz bei Upgrade). Falls leer, wird 'price' angenommen.
   */
  async subscribe(creatorId: string, tierId?: string | null, price?: number, amountPaid?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === creatorId) {
      throw new Error('Cannot subscribe to yourself');
    }

    const existingSub = await this.getActiveSubscription(user.id, creatorId);

    // Preis-Fallback
    let subscriptionPrice = price;
    let creatorName = 'Creator';

    if (subscriptionPrice === undefined || subscriptionPrice === null) {
      // Falls kein Preis übergeben wurde, holen wir ihn uns (nur bei Neu-Abo relevant, aber sicherheitshalber)
      const { data: creator } = await supabase
        .from('users')
        .select('subscription_price, display_name')
        .eq('id', creatorId)
        .single();
      subscriptionPrice = creator?.subscription_price || 0;
      creatorName = creator?.display_name || 'Creator';
    } else {
       // Creator Name holen für Payment Metadata
       const { data: creator } = await supabase.from('users').select('display_name').eq('id', creatorId).single();
       creatorName = creator?.display_name || 'Creator';
    }

    // Der Betrag, der in die Payment-Tabelle kommt
    const paymentAmount = amountPaid !== undefined ? amountPaid : subscriptionPrice;


    if (existingSub && existingSub.status === 'CANCELED') {
      // --- FALL 1: REAKTIVIERUNG ---
      console.log("Reactivating CANCELED subscription...");

      // Wir aktualisieren auch das Tier und den Preis, falls sich diese geändert haben beim Reaktivieren
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          auto_renew: true,
          tier_id: tierId || null, // Tier aktualisieren
          price: subscriptionPrice // Neuen Preis setzen
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) throw error;

      // Bei Reaktivierung kann auch eine Zahlung fällig sein (wenn sofort gezahlt wurde)
      if (paymentAmount > 0) {
          await this.createPaymentRecord(user.id, creatorId, paymentAmount, data.id, creatorName, 'SUBSCRIPTION');
      }

      return data;

    } else if (existingSub && existingSub.status === 'ACTIVE') {
      // --- FALL 2: AKTIVES ABO (UPGRADE / DOWNGRADE / CHANGE) ---

      // Prüfen, ob es sich um eine Änderung handelt (anderes Tier)
      if (existingSub.tier_id !== (tierId || null)) {
          console.log("Updating ACTIVE subscription (Tier Change)...");

          // Abo-Datensatz aktualisieren
          const { data, error } = await supabase
            .from('subscriptions')
            .update({
                tier_id: tierId || null,
                price: subscriptionPrice, // Der NEUE monatliche Preis
                // Wir behalten das alte end_date bei (Abrechnungszeitraum bleibt gleich),
                // außer wir wollten es explizit ändern.
            })
            .eq('id', existingSub.id)
            .select()
            .single();

          if (error) throw error;

          // Zahlung eintragen (z.B. die Upgrade-Differenz)
          if (paymentAmount > 0) {
             await this.createPaymentRecord(user.id, creatorId, paymentAmount, existingSub.id, creatorName, 'SUBSCRIPTION');
          }

          return data;
      } else {
          // Gleiches Tier, aktiver Status -> Fehler
          throw new Error('Already actively subscribed.');
      }

    } else {
      // --- FALL 3: NEUES ABO ---
      console.log("Creating NEW subscription...");

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 Monat Laufzeit

      const subscriptionData: SubscriptionInsert = {
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: tierId || null,
        price: subscriptionPrice,
        status: 'ACTIVE',
        end_date: endDate.toISOString(),
        auto_renew: true,
      };

      // 1. Abo erstellen
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Subscription creation failed.');

      // 2. Zahlung eintragen
      if (paymentAmount > 0) {
        await this.createPaymentRecord(user.id, creatorId, paymentAmount, data.id, creatorName, 'SUBSCRIPTION');
      }

      // 3. Willkommensnachricht
      this.sendWelcomeMessage(creatorId, user.id, creatorName);

      return data;
    }
  }

  // Helper: Payment Record erstellen
  private async createPaymentRecord(userId: string, creatorId: string, amount: number, subscriptionId: string, creatorName: string, type: 'SUBSCRIPTION') {
      const paymentData: PaymentInsert = {
        user_id: userId,
        creator_id: creatorId,
        amount: amount,
        currency: 'EUR',
        type: type,
        status: 'SUCCESS',
        related_id: subscriptionId,
        metadata: { creatorName: creatorName }
      };

      const { error } = await supabase.from('payments').insert(paymentData);
      if (error) console.error("CRITICAL: Failed to create payment record:", error);
  }

  // Helper: Willkommensnachricht
  private async sendWelcomeMessage(creatorId: string, fanId: string, creatorName: string) {
      try {
        const { data: creatorProfile } = await supabase
          .from('users')
          .select('welcome_message')
          .eq('id', creatorId)
          .single();

        const customMessage = creatorProfile?.welcome_message;
        const messageToSend = (customMessage && customMessage.trim() !== '')
            ? customMessage
            : `Vielen Dank für dein Abonnement bei ${creatorName}! Ich freue mich, dich hier zu haben.`;

        await messageService.sendWelcomeMessage(creatorId, fanId, messageToSend);
      } catch (msgError) {
        console.error("Fehler beim Senden der Willkommensnachricht:", msgError);
      }
  }

  async cancelSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELED',
        auto_renew: false,
      })
      .eq('id', subscriptionId)
      .eq('fan_id', user.id); // Sicherheitscheck

    if (error) throw error;
  }

  async getUserSubscriptions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        creator:users!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('fan_id', user.id)
      .in('status', ['ACTIVE', 'CANCELED'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    return this.mapSubscriptionsToFrontend(subscriptions || []);
  }

  async getCreatorSubscribers(creatorId: string) {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        fan:users!fan_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('creator_id', creatorId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return subscriptions;
  }

  async checkSubscription(fanId: string, creatorId: string): Promise<boolean> {
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('fan_id', fanId)
      .eq('creator_id', creatorId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    return !!data;
  }

  async getActiveSubscription(fanId: string, creatorId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('fan_id', fanId)
      .eq('creator_id', creatorId)
      .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  private mapSubscriptionsToFrontend(subscriptions: any[]): Subscription[] {
    return subscriptions.map(sub => ({
      id: sub.id,
      fanId: sub.fan_id,
      creatorId: sub.creator_id,
      tierId: sub.tier_id,
      status: sub.status,
      price: parseFloat(sub.price),
      startDate: sub.start_date,
      endDate: sub.end_date,
      autoRenew: sub.auto_renew,
      creator: sub.creator ? {
        id: sub.creator.id,
        name: sub.creator.display_name,
        username: sub.creator.username,
        avatar: sub.creator.avatar_url || 'https://placehold.co/100x100',
        isVerified: sub.creator.is_verified,
      } : undefined,
    }));
  }
}

export const subscriptionService = new SubscriptionService();