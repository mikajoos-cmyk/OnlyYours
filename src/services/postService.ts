// src/services/postService.ts
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
  price: number;
  tier_id: string | null;
}

export class PostService {

  async createPost(post: {
    mediaUrl: string;
    mediaType: 'IMAGE' | 'VIDEO';
    thumbnail_url?: string | null;
    caption?: string;
    hashtags?: string[];
    price?: number;
    tierId?: string | null;
    scheduledFor?: string | null;
    is_published?: boolean;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let resolvedIsPublished = true;
    if (post.scheduledFor) {
      resolvedIsPublished = true;
    } else if (post.is_published === false) {
      resolvedIsPublished = false;
    }

    const postData: PostInsert = {
      creator_id: user.id,
      media_url: post.mediaUrl,
      media_type: post.mediaType,
      thumbnail_url: post.thumbnail_url || null,
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      price: post.price || 0,
      tier_id: post.tierId || null,
      scheduled_for: post.scheduledFor || null,
      is_published: resolvedIsPublished,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }


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
      .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`);

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
      .or('scheduled_for.is.null,scheduled_for.lte.now()')
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
      .or('scheduled_for.is.null,scheduled_for.lte.now()')
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


  // --- AKTUALISIERTE FUNKTION: searchPosts ---
  /**
   * Sucht Posts anhand von Hashtags oder Bildbeschriftung.
   * Akzeptiert jetzt Filter für Preis, Typ und Abos.
   */
  async searchPosts(
    query: string,
    limit: number = 30,
    filters?: { price?: string; type?: string; subscribedOnly?: boolean }
  ): Promise<Post[]> {
    const cleanedQuery = query.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanedQuery) return [];

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let queryBuilder = supabase
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
      .or(
        `caption.ilike.%${cleanedQuery}%,` +     // Suche in der Beschreibung
        `hashtags.cs.{${cleanedQuery}}`        // Suche in Hashtags (array contains string)
      );

    // --- FILTER-LOGIK HINZUGEFÜGT ---

    // 1. Abo-Filter
    if (filters?.subscribedOnly && userId) {
      // 1. Hole abonnierte Creator-IDs
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('fan_id', userId)
        .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`);

      const creatorIds = subscriptions?.map(s => s.creator_id) || [];

      if (creatorIds.length === 0) {
        return []; // Wenn keine Abos, dann keine Ergebnisse
      }
      // 2. Füge der Abfrage hinzu
      queryBuilder = queryBuilder.in('creator_id', creatorIds);
    }

    // 2. Preis-Filter
    if (filters?.price) {
      if (filters.price === 'free') {
        queryBuilder = queryBuilder.eq('price', 0).is('tier_id', null);
      } else if (filters.price === 'low') {
        queryBuilder = queryBuilder.gt('price', 0).lte('price', 10);
      } else if (filters.price === 'medium') {
        queryBuilder = queryBuilder.gt('price', 10).lte('price', 30);
      } else if (filters.price === 'high') {
        queryBuilder = queryBuilder.gt('price', 30);
      }
    }

    // 3. Medientyp-Filter
    if (filters?.type) {
      if (filters.type === 'video') {
        queryBuilder = queryBuilder.eq('media_type', 'VIDEO');
      } else if (filters.type === 'photo') {
        queryBuilder = queryBuilder.eq('media_type', 'IMAGE');
      }
    }
    // --- ENDE FILTER-LOGIK ---

    const { data: posts, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Fehler bei der Post-Suche:", error);
      throw error;
    }

    // Likes für die gefundenen Posts abrufen
    let userLikes: Set<string> = new Set();
    if (userId && posts.length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', posts.map(p => p.id));

      userLikes = new Set(likes?.map(l => l.post_id) || []);
    }

    return this.mapPostsToFrontend(posts || [], userLikes);
  }
  // --- ENDE ---


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
      price: post.price,
      tier_id: post.tier_id,
    }));
  }
}

export const postService = new PostService();