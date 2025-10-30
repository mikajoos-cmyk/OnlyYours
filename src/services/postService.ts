import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type PostRow = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostUpdate = Database['public']['Tables']['posts']['Update'];

export interface Post {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    isVerified: boolean;
    bio: string;
    followers: number;
    subscriptionPrice: number;
    username?: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video';
  thumbnail_url: string | null;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  is_published: boolean;
  scheduled_for: string | null;
  created_at: string;
}

export class PostService {

  // --- AKTUALISIERTE createPost FUNKTION ---
  async createPost(post: {
    mediaUrl: string;
    mediaType: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null; // Thumbnail hinzugefügt
    caption?: string;
    hashtags?: string[];
    price?: number;
    tierId?: string | null;
    scheduledFor?: string | null;
    is_published?: boolean; // Status für Entwürfe hinzugefügt
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Standard-Veröffentlichungslogik
    // Wenn scheduledFor gesetzt ist, wird is_published ignoriert (da es geplant ist)
    // Ansonsten ist es standardmäßig true (veröffentlicht)
    // Außer, is_published wird explizit als false (Entwurf) übergeben
    let resolvedIsPublished = true;
    if (post.scheduledFor) {
      resolvedIsPublished = true; // Geplante Posts sind "veröffentlicht", aber erst später sichtbar
    } else if (post.is_published === false) {
      resolvedIsPublished = false; // Explizit als Entwurf gespeichert
    }

    const postData: PostInsert = {
      creator_id: user.id,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
      thumbnail_url: post.thumbnail_url || null, // Thumbnail speichern
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      price: post.price || 0,
      tier_id: post.tierId || null,
      scheduled_for: post.scheduledFor || null,
      is_published: resolvedIsPublished, // Aufgelösten Status verwenden
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  // --- ENDE AKTUALISIERUNG ---


  async getDiscoveryFeed(limit: number = 20, offset: number = 0) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        creator:users!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          bio,
          followers_count,
          subscription_price
        )
      `)
      .eq('is_published', true)
      .is('scheduled_for', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let userLikes: Set<string> = new Set();
    if (userId) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', posts?.map(p => p.id) || []);

      userLikes = new Set(likes?.map(l => l.post_id) || []);
    }

    return this.mapPostsToFrontend(posts || [], userLikes);
  }

  async getSubscriberFeed(limit: number = 20, offset: number = 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('fan_id', user.id)
      .eq('status', 'ACTIVE');

    const creatorIds = subscriptions?.map(s => s.creator_id) || [];
    if (creatorIds.length === 0) return [];

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        creator:users!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          bio,
          followers_count,
          subscription_price
        )
      `)
      .in('creator_id', creatorIds)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', posts?.map(p => p.id) || []);

    const userLikes = new Set(likes?.map(l => l.post_id) || []);

    return this.mapPostsToFrontend(posts || [], userLikes);
  }

  async getCreatorPosts(creatorId: string, limit: number = 20, offset: number = 0) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        creator:users!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          bio,
          followers_count,
          subscription_price
        )
      `)
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let userLikes: Set<string> = new Set();
    if (userId) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', posts?.map(p => p.id) || []);

      userLikes = new Set(likes?.map(l => l.post_id) || []);
    }

    return this.mapPostsToFrontend(posts || [], userLikes);
  }

  async getCreatorVaultPosts(creatorId: string, limit: number = 50, offset: number = 0): Promise<Post[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== creatorId) throw new Error('Not authorized to view vault');

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        creator:users!creator_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified,
          bio,
          followers_count,
          subscription_price
        )
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', posts?.map(p => p.id) || []);

    const userLikes = new Set(likes?.map(l => l.post_id) || []);

    return this.mapPostsToFrontend(posts || [], userLikes);
  }


  async toggleLike(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (existingLike) {
      await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      await supabase.rpc('decrement_likes_count', { post_id_input: postId });

      return false;
    } else {
      await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      await supabase.rpc('increment_likes_count', { post_id_input: postId });

      return true;
    }
  }

  async updatePost(postId: string, updates: PostUpdate) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePost(postId: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  }

  private mapPostsToFrontend(posts: any[], userLikes: Set<string>): Post[] {
    return posts.map(post => ({
      id: post.id,
      creatorId: post.creator_id,
      creator: {
        id: post.creator.id,
        name: post.creator.display_name,
        username: post.creator.username,
        avatar: post.creator.avatar_url || 'https://placehold.co/100x100',
        isVerified: post.creator.is_verified,
        bio: post.creator.bio,
        followers: post.creator.followers_count,
        subscriptionPrice: parseFloat(post.creator.subscription_price),
      },
      mediaUrl: post.media_url,
      mediaType: post.media_type.toLowerCase() as 'image' | 'video',
      thumbnail_url: post.thumbnail_url,
      caption: post.caption,
      hashtags: post.hashtags,
      likes: post.likes_count,
      comments: post.comments_count,
      isLiked: userLikes.has(post.id),
      is_published: post.is_published,
      scheduled_for: post.scheduled_for,
      created_at: post.created_at,
    }));
  }
}

export const postService = new PostService();