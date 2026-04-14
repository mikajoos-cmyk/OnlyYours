import { supabase } from '../lib/supabase';

export const followerService = {
  async followCreator(creatorId: string, followerId: string) {
    const { error } = await supabase
      .from('followers')
      .insert({ creator_id: creatorId, follower_id: followerId });
    if (error) throw error;
  },

  async unfollowCreator(creatorId: string, followerId: string) {
    const { error } = await supabase
      .from('followers')
      .delete()
      .match({ creator_id: creatorId, follower_id: followerId });
    if (error) throw error;
  },

  async isFollowing(creatorId: string, followerId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .match({ creator_id: creatorId, follower_id: followerId })
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignoriere "Kein Ergebnis"-Fehler
    return !!data;
  },

  async getFollowedCreatorIds(followerId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('followers')
      .select('creator_id')
      .eq('follower_id', followerId);
    
    if (error) throw error;
    return data.map(d => d.creator_id);
  }
};
