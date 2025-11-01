// src/services/subscriptionService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];

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
  async subscribe(creatorId: string, tierId?: string | null, price?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === creatorId) {
      throw new Error('Cannot subscribe to yourself');
    }

    // --- KORREKTUR HIER ---
    // Wenn 'price' (aus dem Modal) übergeben wird, verwenden wir diesen.
    // Wir fragen die DB nur ab, wenn 'price' NICHT übergeben wurde.
    let subscriptionPrice = price;
    if (subscriptionPrice === undefined || subscriptionPrice === null) {
      // Dieser Block wird jetzt (wahrscheinlich) nicht mehr aufgerufen,
      // aber der 'creatorId'-Check ist trotzdem wichtig.
      if (!creatorId) throw new Error("Creator ID is missing for price lookup.");
      
      const { data: creator } = await supabase
        .from('users')
        .select('subscription_price')
        .eq('id', creatorId)
        .single();

      subscriptionPrice = creator?.subscription_price || 0;
    }
    // --- ENDE KORREKTUR ---

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const subscriptionData: SubscriptionInsert = {
      fan_id: user.id,
      creator_id: creatorId, // creatorId wird von PaymentModal durchgereicht
      tier_id: tierId || null,
      price: subscriptionPrice,
      status: 'ACTIVE',
      end_date: endDate.toISOString(),
      auto_renew: true,
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (error) throw error;

    await this.updateFollowersCount(creatorId, 1);

    return data;
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

    await this.updateFollowersCount(subscription.creator_id, -1);
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
      // (Geändert) Holt alle, damit 'FanProfile' den Status 'CANCELED' anzeigen kann
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
      // (Geändert) Berücksichtigt auch noch laufende gekündigte Abos
      .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  private async updateFollowersCount(creatorId: string, delta: number) {
    await supabase.rpc('update_followers_count', {
      creator_id: creatorId,
      delta_value: delta,
    });
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