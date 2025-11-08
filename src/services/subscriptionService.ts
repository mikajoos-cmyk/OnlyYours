// src/services/subscriptionService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { messageService } from './messageService';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert']; // NEU

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

  // --- HIER IST DIE ÄNDERUNG (Re-Abo-Logik UND Payment-Eintrag) ---
  async subscribe(creatorId: string, tierId?: string | null, price?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === creatorId) {
      throw new Error('Cannot subscribe to yourself');
    }

    const existingSub = await this.getActiveSubscription(user.id, creatorId);

    if (existingSub && existingSub.status === 'CANCELED') {
      // 2.A RE-AKTIVIEREN
      console.log("Reactivating CANCELED subscription...");
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'ACTIVE',
          auto_renew: true,
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) throw error;

      // HINWEIS: Bei Re-Aktivierung wird KEINE neue Zahlung erstellt,
      // da die Zahlung erst am (bestehenden) end_date fällig wird.
      // Der Follower-Count-Trigger wird daher auch nicht ausgelöst.

      return data;

    } else if (existingSub && existingSub.status === 'ACTIVE') {
      throw new Error('Already actively subscribed.');

    } else {
      // 2.B NEUES ABO ERSTELLEN
      console.log("Creating NEW subscription...");
      let subscriptionPrice = price;
      let creatorName = 'Creator'; // Fallback-Name

      if (subscriptionPrice === undefined || subscriptionPrice === null) {
        if (!creatorId) throw new Error("Creator ID is missing for price lookup.");

        const { data: creator } = await supabase
          .from('users')
          .select('subscription_price, display_name') // Namen für Payment-Metadaten holen
          .eq('id', creatorId)
          .single();

        subscriptionPrice = creator?.subscription_price || 0;
        creatorName = creator?.display_name || 'Creator';
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Läuft 1 Monat ab JETZT

      const subscriptionData: SubscriptionInsert = {
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: tierId || null,
        price: subscriptionPrice,
        status: 'ACTIVE',
        end_date: endDate.toISOString(),
        auto_renew: true,
      };

      // 1. Abo-Eintrag erstellen
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Subscription creation failed.');

      // --- KORREKTUR: 2. Payment-Eintrag erstellen ---
      const paymentData: PaymentInsert = {
        user_id: user.id,
        creator_id: creatorId, // Wichtig für die Zuordnung!
        amount: subscriptionPrice,
        currency: 'EUR',
        type: 'SUBSCRIPTION',
        status: 'SUCCESS', // Zahlung als erfolgreich simulieren
        related_id: data.id, // Verknüpfung zur Subscription-ID
        metadata: {
          creatorName: creatorName
        }
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) {
        // Payment-Fehler loggen, aber den Abo-Flow nicht stoppen
        console.error("CRITICAL: Failed to create payment record for subscription:", paymentError);
      }
      // --- ENDE KORREKTUR ---


      // --- KORREKTUR: Follower-Count wird jetzt vom DB-Trigger (on_successful_payment) gehandhabt ---
      // await this.updateFollowersCount(creatorId, 1); // ENTFERNT

      // Willkommensnachricht senden (bleibt gleich)
      try {
        const { data: creatorProfile } = await supabase
          .from('users')
          .select('display_name, welcome_message')
          .eq('id', creatorId)
          .single();

        const customMessage = creatorProfile?.welcome_message;
        const cName = creatorProfile?.display_name || 'dem Creator';
        let messageToSend: string;

        if (customMessage && customMessage.trim() !== '') {
          messageToSend = customMessage;
        } else {
          messageToSend = `Vielen Dank für dein Abonnement bei ${cName}! Ich freue mich, dich hier zu haben.`;
        }
        await messageService.sendWelcomeMessage(creatorId, user.id, messageToSend);
      } catch (msgError) {
        console.error("Fehler beim Senden der Willkommensnachricht:", msgError);
      }

      return data;
    }
  }

  async cancelSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('id', subscriptionId)
      .eq('fan_id', user.id)
      .single();

    if (!subscription) throw new Error('Subscription not found');

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELED',
        auto_renew: false,
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    // --- KORREKTUR: Follower-Zahl wird bei Kündigung NICHT mehr verringert ---
    // await this.updateFollowersCount(subscription.creator_id, -1); // ENTFERNT
  }

  // ... (Rest der Datei bleibt gleich) ...
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

  // Diese Funktion holt Abos, die 'ACTIVE' sind ODER 'CANCELED' und noch gültig
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

  private async updateFollowersCount(creatorId: string, delta: number) {
    // Diese Funktion wird durch den DB-Trigger ersetzt, bleibt aber
    // für den Fall, dass sie an anderer Stelle noch benötigt wird (obwohl die RPC entfernt wurde).
    // Im Idealfall sollte sie entfernt werden.
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