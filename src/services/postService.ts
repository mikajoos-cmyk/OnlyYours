import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { storageService } from './storageService';

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
      .insert(postData as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDiscoveryFeed(limit: number = 20, offset: number = 0) {
    const { data: { user } } = await supabase.auth.getUser();

    let posts: any[] = [];
    let error: any = null;

    if (user) {
      const { data, error: rpcError } = await supabase
        .rpc('get_recommended_feed', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        } as any);

      if (rpcError) {
        console.error("Algorithmus-Fehler, Fallback auf Standard:", rpcError);
      } else {
        const postIds = (data as any[])?.map((p: any) => p.id) || [];
        if (postIds.length > 0) {
          const { data: richPosts, error: richError } = await supabase
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
            .in('id', postIds);

          if (!richError && richPosts) {
            const sortMap = new Map((data as any[]).map((p: any, index: number) => [p.id, index]));
            posts = (richPosts as any[]).sort((a: any, b: any) => {
              return (sortMap.get(a.id) || 0) - (sortMap.get(b.id) || 0);
            });
          } else {
            error = richError;
          }
        }
      }
    }

    if (posts.length === 0 && !error) {
      const { data: standardPosts, error: standardError } = await supabase
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
        .or('scheduled_for.is.null,scheduled_for.lte.now()')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      posts = standardPosts as any[] || [];
      error = standardError;
    }

    if (error) throw error;

    const userId = user?.id;
    let userLikes: Set<string> = new Set();
    if (userId && posts.length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', posts.map((p: any) => p.id));

      userLikes = new Set(likes?.map((l: any) => l.post_id) || []);
    }

    return await this.mapPostsToFrontend(posts, userLikes);
  }

  async getSubscriberFeed(limit: number = 20, offset: number = 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('fan_id', user.id)
      .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`);

    const creatorIds = subscriptions?.map((s: any) => s.creator_id) || [];
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
      .in('post_id', (posts as any[] || []).map((p: any) => p.id));

    const userLikes = new Set(likes?.map((l: any) => l.post_id) || []);

    return await this.mapPostsToFrontend(posts as any[] || [], userLikes);
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
        .in('post_id', (posts as any[] || []).map((p: any) => p.id));

      userLikes = new Set(likes?.map((l: any) => l.post_id) || []);
    }

    return await this.mapPostsToFrontend(posts as any[] || [], userLikes);
  }

  async getPostById(postId: string): Promise<Post | null> {
    const { data: post, error } = await supabase
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
      .eq('id', postId)
      .eq('is_published', true)
      .or('scheduled_for.is.null,scheduled_for.lte.now()')
      .single();

    if (error || !post) {
      if (error && (error as any).code !== 'PGRST116') {
        console.error("Error fetching post by ID:", error);
      }
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    let userLikes: Set<string> = new Set();

    if (userId) {
      const { data: like } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .maybeSingle();

      if (like) {
        userLikes.add((like as any).post_id);
      }
    }

    const mappedPosts = await this.mapPostsToFrontend([post], userLikes);
    return mappedPosts[0];
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
      .in('post_id', (posts as any[] || []).map((p: any) => p.id));

    const userLikes = new Set(likes?.map((l: any) => l.post_id) || []);

    return await this.mapPostsToFrontend(posts as any[] || [], userLikes);
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
        .eq('id', (existingLike as any).id);

      await supabase.rpc('decrement_likes_count', { post_id_input: postId } as any);

      return false;
    } else {
      await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          post_id: postId,
        } as any);

      await supabase.rpc('increment_likes_count', { post_id_input: postId } as any);

      return true;
    }
  }

  async updatePost(postId: string, updates: PostUpdate) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates as any)
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
        `caption.ilike.%${cleanedQuery}%,` +
        `hashtags.cs.{${cleanedQuery}}`
      );

    if (filters?.subscribedOnly && userId) {
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('fan_id', userId)
        .or(`status.eq.ACTIVE,and(status.eq.CANCELED,end_date.gt.now())`);

      const creatorIds = subscriptions?.map((s: any) => s.creator_id) || [];

      if (creatorIds.length === 0) {
        return [];
      }
      queryBuilder = queryBuilder.in('creator_id', creatorIds);
    }

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

    if (filters?.type) {
      if (filters.type === 'video') {
        queryBuilder = queryBuilder.eq('media_type', 'VIDEO');
      } else if (filters.type === 'photo') {
        queryBuilder = queryBuilder.eq('media_type', 'IMAGE');
      }
    }

    const { data: posts, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Fehler bei der Post-Suche:", error);
      throw error;
    }

    let userLikes: Set<string> = new Set();
    if (userId && (posts as any[]).length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', (posts as any[]).map((p: any) => p.id));

      userLikes = new Set(likes?.map((l: any) => l.post_id) || []);
    }

    return await this.mapPostsToFrontend(posts || [], userLikes);
  }

  private async mapPostsToFrontend(posts: any[], userLikes: Set<string>): Promise<Post[]> {
    return Promise.all(posts.map(async post => ({
      id: post.id,
      creatorId: post.creator_id,
      creator: {
        id: post.creator.id,
        name: post.creator.display_name,
        username: post.creator.username,
        avatar: await storageService.resolveImageUrl(post.creator.avatar_url),
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
    })));
  }
}

export const postService = new PostService();