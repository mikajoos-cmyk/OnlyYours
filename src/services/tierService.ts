// src/services/tierService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type Tier = Database['public']['Tables']['subscription_tiers']['Row'];
type TierInsert = Database['public']['Tables']['subscription_tiers']['Insert'];
type TierUpdate = Database['public']['Tables']['subscription_tiers']['Update'];

export class TierService {

  /**
   * Ruft alle Tiers für einen bestimmten Creator ab.
   * Verwendet die neue RPC-Funktion 'get_creator_tiers'.
   */
  async getCreatorTiers(creatorId: string): Promise<Tier[]> {
    const { data, error } = await supabase.rpc('get_creator_tiers', {
      p_creator_id: creatorId,
    });

    if (error) {
      console.error('Error fetching creator tiers:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Erstellt eine neue Abonnement-Stufe für den aktuell angemeldeten Creator.
   */
  async createTier(tierData: {
    name: string;
    price: number;
    description: string;
    benefits: string[]; // Frontend sendet einfaches String-Array
  }): Promise<Tier> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData: TierInsert = {
      creator_id: user.id,
      name: tierData.name,
      price: tierData.price,
      description: tierData.description,
      benefits: tierData.benefits as Json, // Als JSON speichern
      is_active: true,
      // 'position' wird standardmäßig (oder durch einen DB-Trigger) gesetzt
    };

    const { data, error } = await supabase
      .from('subscription_tiers')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Aktualisiert eine bestehende Abonnement-Stufe.
   */
  async updateTier(tierId: string, updates: TierUpdate): Promise<Tier> {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .update(updates)
      .eq('id', tierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Löscht eine Abonnement-Stufe.
   * (Stellt sicher, dass RLS in der DB dies erlaubt)
   */
  async deleteTier(tierId: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_tiers')
      .delete()
      .eq('id', tierId);

    if (error) throw error;
  }
}

export const tierService = new TierService();