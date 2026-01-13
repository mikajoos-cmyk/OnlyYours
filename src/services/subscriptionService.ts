// src/services/subscriptionService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { messageService } from './messageService';

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

  async subscribe(creatorId: string, tierId?: string | null, price?: number, amountPaid?: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (user.id === creatorId) {
      throw new Error('Cannot subscribe to yourself');
    }

    const existingSub = await this.getActiveSubscription(user.id, creatorId);

    // Preis-Fallback
    let subscriptionPrice: number;
    let creatorName = 'Creator';

    if (price === undefined || price === null) {
      const { data: creator } = await (supabase
        .from('users')
        .select('subscription_price, display_name')
        .eq('id', creatorId)
        .single() as any);
      subscriptionPrice = creator?.subscription_price || 0;
      creatorName = creator?.display_name || 'Creator';
    } else {
      subscriptionPrice = price;
      const { data: creator } = await (supabase.from('users').select('display_name').eq('id', creatorId).single() as any);
      creatorName = creator?.display_name || 'Creator';
    }

    const paymentAmount: number = amountPaid !== undefined ? amountPaid : (subscriptionPrice || 0);

    // --- FALL 1: REAKTIVIERUNG (Gekündigtes Abo) ---
    if (existingSub && existingSub.status === 'CANCELED') {
      console.log("Reactivating CANCELED subscription...");

      // Nutzt die Resume-Funktion, um Stripe zu aktualisieren
      await this.resumeSubscription(existingSub.id);

      // Update DB mit neuem Tier/Preis
      const { data, error } = await (supabase
        .from('subscriptions') as any)
        .update({
          tier_id: tierId || null,
          price: subscriptionPrice
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    // --- FALL 2: ÄNDERUNG (Upgrade / Downgrade) ---
    else if (existingSub && existingSub.status === 'ACTIVE') {
      if (existingSub.tier_id !== (tierId || null)) {
        console.log("Updating subscription Tier via Edge Function...");

        // NEU: Edge Function aufrufen für Planwechsel in Stripe (wichtig für Downgrades!)
        const { error: edgeError } = await supabase.functions.invoke('update-subscription', {
          body: {
            subscriptionId: existingSub.id,
            newTierId: tierId || null,
            newPrice: subscriptionPrice
          }
        });

        if (edgeError) {
          console.error("Fehler beim Stripe Update:", edgeError);
          // Wir machen trotzdem weiter, um die DB konsistent zu halten, warnen aber
        }

        // DB Update
        const { data, error } = await (supabase
          .from('subscriptions') as any)
          .update({
            tier_id: tierId || null,
            price: subscriptionPrice,
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (error) throw error;

        // Payment nur eintragen, wenn wirklich Geld geflossen ist (Upgrade)
        // Bei Downgrade ist paymentAmount 0 -> kein Eintrag.
        if (paymentAmount > 0) {
          await this.createPaymentRecord(user.id, creatorId, paymentAmount, existingSub.id, creatorName, 'SUBSCRIPTION');
        }
        return data;
      } else {
        // Reaktivierung falls nur auto-renew aus war
        if (!existingSub.auto_renew) {
          return this.resumeSubscription(existingSub.id);
        }
        throw new Error('Already actively subscribed.');
      }

    } else {
      // --- FALL 3: NEUES ABO ---
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
        .insert(subscriptionData as any)
        .select()
        .single();

      if (error) throw error;

      if (paymentAmount > 0) {
        await this.createPaymentRecord(user.id, creatorId, paymentAmount, (data as any).id, creatorName, 'SUBSCRIPTION');
      }

      this.sendWelcomeMessage(creatorId, user.id, creatorName);
      return data;
    }
  }

  // --- HELPER: Payment Record (FIXED) ---
  private async createPaymentRecord(userId: string, creatorId: string, amount: number, subscriptionId: string, creatorName: string, type: 'SUBSCRIPTION') {
    // WICHTIG: Wir bauen das Objekt manuell und casten zu 'any', 
    // damit TypeScript nicht meckert, falls 'creator_id' in den generierten Typen fehlt.
    const paymentData = {
      user_id: userId,
      creator_id: creatorId, // Dies ist das kritische Feld!
      amount: amount,
      currency: 'EUR',
      type: type,
      status: 'SUCCESS',
      related_id: subscriptionId,
      metadata: { creatorName: creatorName }
    };

    // 'as any' umgeht veraltete Typ-Definitionen
    const { error } = await supabase.from('payments').insert(paymentData as any);

    if (error) {
      console.error("CRITICAL: Failed to create payment record:", error);
      // Wir werfen den Fehler nicht weiter, damit der User-Flow (Abo erfolgreich) nicht abbricht.
    }
  }

  // src/services/subscriptionService.ts

  async resumeSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log("Resuming subscription via Edge Function...", subscriptionId);

    // Wir rufen NUR die Edge Function auf. 
    // Sie kümmert sich um Stripe UND das Datenbank-Update (als Admin).
    const { data, error } = await supabase.functions.invoke('resume-subscription', {
      body: { subscriptionId }
    });

    if (error) {
      console.error("Edge Function failed:", error);
      throw new Error(error.message || "Reaktivierung fehlgeschlagen");
    }

    console.log("✅ Reaktivierung erfolgreich. Antwort:", data);

    // Wir machen KEIN manuelles DB-Update mehr hier.
    // Stattdessen vertrauen wir darauf, dass der Aufrufer (z.B. FanProfile.tsx)
    // danach `fetchData()` oder `loadSubscriptions()` aufruft, um die frischen Daten zu holen.
  }

  async cancelSubscription(subscriptionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log("Cancelling subscription...", subscriptionId);
    const { error: functionError } = await supabase.functions.invoke('cancel-subscription', {
      body: { subscriptionId }
    });

    if (functionError) {
      console.warn("Edge Function failed, fallback DB", functionError);
      const { error: dbError } = await (supabase
        .from('subscriptions') as any)
        .update({ auto_renew: false } as any)
        .eq('id', subscriptionId)
        .eq('fan_id', user.id);
      if (dbError) throw dbError;
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
    // Implementation... (gekürzt für Übersichtlichkeit, bleibt wie vorher)
    const { data, error } = await (supabase.from('subscriptions').select('*, fan:users!fan_id(*)') as any).eq('creator_id', creatorId).eq('status', 'ACTIVE');
    if (error) throw error;
    return data;
  }

  async checkSubscription(fanId: string, creatorId: string): Promise<boolean> {
    const { data } = await (supabase
      .from('subscriptions')
      .select('id')
      .eq('fan_id', fanId)
      .eq('creator_id', creatorId)
      .eq('status', 'ACTIVE')
      .maybeSingle() as any);
    return !!data;
  }

  async getActiveSubscription(fanId: string, creatorId: string): Promise<Database['public']['Tables']['subscriptions']['Row'] | null> {
    const { data, error } = await (supabase
      .from('subscriptions')
      .select('*')
      .eq('fan_id', fanId)
      .eq('creator_id', creatorId)
      .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`)
      .maybeSingle() as any);

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

  private async sendWelcomeMessage(creatorId: string, fanId: string, creatorName: string) {
    try {
      const { data: creatorProfile } = await (supabase.from('users').select('welcome_message').eq('id', creatorId).single() as any);
      const msg = creatorProfile?.welcome_message || `Vielen Dank für dein Abonnement bei ${creatorName}!`;
      await messageService.sendWelcomeMessage(creatorId, fanId, msg);
    } catch (e) { console.error(e); }
  }
}

export const subscriptionService = new SubscriptionService();