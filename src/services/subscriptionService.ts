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
      const { data: creator } = await supabase
        .from('users')
        .select('subscription_price, display_name')
        .eq('id', creatorId)
        .single() as any;
      subscriptionPrice = creator?.subscription_price || 0;
      creatorName = creator?.display_name || 'Creator';
    } else {
      const { data: creator } = await supabase.from('users').select('display_name').eq('id', creatorId).single() as any;
      creatorName = creator?.display_name || 'Creator';
    }

    const paymentAmount = (amountPaid !== undefined ? amountPaid : subscriptionPrice) ?? 0;

    // Fall 1: Reaktivierung eines gekündigten (aber noch sichtbaren) Abos
    if (existingSub && existingSub.status === 'CANCELED') {
      console.log("Reactivating CANCELED subscription...");
      const { data, error } = await (supabase
        .from('subscriptions') as any)
        .update({
          status: 'ACTIVE',
          auto_renew: true,
          tier_id: tierId || null,
          price: subscriptionPrice
        })
        .eq('id', existingSub.id)
        .select()
        .single() as any;

      if (error) throw error;

      if (paymentAmount > 0) {
        await this.createPaymentRecord(user.id, creatorId, paymentAmount, data.id, creatorName, 'SUBSCRIPTION');
      }
      return data;

    } else if (existingSub && existingSub.status === 'ACTIVE') {
      // Fall 2: Aktives Abo (Upgrade / Downgrade)
      if (existingSub.tier_id !== (tierId || null)) {
        console.log("Updating ACTIVE subscription (Tier Change)...");
        const { data, error } = await (supabase
          .from('subscriptions') as any)
          .update({
            tier_id: tierId || null,
            price: subscriptionPrice,
          })
          .eq('id', existingSub.id)
          .select()
          .single() as any;

        if (error) throw error;

        if (paymentAmount > 0) {
          await this.createPaymentRecord(user.id, creatorId, paymentAmount, existingSub.id, creatorName, 'SUBSCRIPTION');
        }
        return data;
      } else {
        // Fall 2b: Nur auto_renew war aus -> Reaktivieren
        if (!existingSub.auto_renew) {
          return this.resumeSubscription(existingSub.id);
        }
        throw new Error('Already actively subscribed.');
      }

    } else {
      // Fall 3: Neues Abo
      console.log("Creating NEW subscription...");
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const subscriptionData: SubscriptionInsert = {
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: tierId || null,
        price: subscriptionPrice,
        status: 'ACTIVE',
        end_date: endDate.toISOString(),
        auto_renew: true,
      };

      const { data, error } = await (supabase
        .from('subscriptions') as any)
        .insert(subscriptionData)
        .select()
        .single() as any;

      if (error) throw error;
      if (!data) throw new Error('Subscription creation failed.');

      if (paymentAmount > 0) {
        await this.createPaymentRecord(user.id, creatorId, paymentAmount, data.id, creatorName, 'SUBSCRIPTION');
      }

      this.sendWelcomeMessage(creatorId, user.id, creatorName);
      return data;
    }
  }

  // --- NEU: REAKTIVIEREN (Resume) ---
  async resumeSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log("Resuming subscription...", subscriptionId);

    // 1. Versuch: Über Edge Function (Stripe Sync)
    const { error: functionError } = await supabase.functions.invoke('resume-subscription', {
      body: { subscriptionId }
    });

    if (functionError) {
      console.warn("Edge Function resume-subscription failed. Falling back to DB update.", functionError);

      // 2. Fallback: DB Update
      const { error: dbError } = await supabase
        .from('subscriptions')
        .update({
          auto_renew: true,
          status: 'ACTIVE' // Sicherstellen, dass es ACTIVE ist
        })
        .eq('id', subscriptionId)
        .eq('fan_id', user.id);

      if (dbError) throw dbError;
    }
  }

  /**
   * Kündigt ein Abonnement (Cancel at period end).
   * ÄNDERUNG: Ändert NUR auto_renew, lässt status und end_date in Ruhe!
   */
  async cancelSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log("Cancelling subscription (at period end)...", subscriptionId);

    // 1. Versuch: Über Edge Function (Stripe Sync)
    const { error: functionError } = await supabase.functions.invoke('cancel-subscription', {
      body: { subscriptionId }
    });

    if (functionError) {
      console.warn("Edge Function cancel-subscription failed (or not present). Falling back to direct DB update.", functionError);

      // 2. Fallback: Nur DB Update
      // WICHTIG: Status bleibt ACTIVE (Zugriff bleibt!), nur auto_renew geht auf FALSE.
      // Das end_date wird NICHT angefasst.
      const { error: dbError } = await supabase
        .from('subscriptions')
        .update({
          auto_renew: false,
          // status: 'CANCELED', <-- ENTFERNT! Status bleibt ACTIVE bis Stripe ihn per Webhook ändert (am Ende der Laufzeit)
        })
        .eq('id', subscriptionId)
        .eq('fan_id', user.id);

      if (dbError) throw dbError;
    }
  }

  // Helper Methoden...
  private async createPaymentRecord(userId: string, creatorId: string, amount: number, subscriptionId: string, creatorName: string, type: 'SUBSCRIPTION') {
    const paymentData: PaymentInsert = {
      user_id: userId,
      // creator_id: creatorId, // Removed as it does not exist in payments table
      amount: amount,
      currency: 'EUR',
      type: type,
      status: 'SUCCESS',
      related_id: subscriptionId,
      metadata: { creatorName: creatorName, creatorId: creatorId } // Added creatorId to metadata instead
    };
    const { error } = await (supabase.from('payments') as any).insert(paymentData);
    if (error) console.error("CRITICAL: Failed to create payment record:", error);
  }

  private async sendWelcomeMessage(creatorId: string, fanId: string, creatorName: string) {
    try {
      const { data: creatorProfile } = await supabase
        .from('users')
        .select('welcome_message')
        .eq('id', creatorId)
        .single() as any;

      const customMessage = creatorProfile?.welcome_message;
      const messageToSend = (customMessage && customMessage.trim() !== '')
        ? customMessage
        : `Vielen Dank für dein Abonnement bei ${creatorName}! Ich freue mich, dich hier zu haben.`;

      await messageService.sendWelcomeMessage(creatorId, fanId, messageToSend);
    } catch (msgError) {
      console.error("Fehler beim Senden der Willkommensnachricht:", msgError);
    }
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
    return data as SubscriptionRow | null;
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