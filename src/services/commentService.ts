import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    isVerified: boolean;
  };
}

export class CommentService {
  async addComment(postId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const commentData: CommentInsert = {
      post_id: postId,
      user_id: user.id,
      content,
    };

    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('increment_comments_count', { post_id: postId });

    return data;
  }

  async getPostComments(postId: string, limit: number = 50, offset: number = 0) {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return this.mapCommentsToFrontend(comments || []);
  }

  async deleteComment(commentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: comment } = await supabase
      .from('comments')
      .select('post_id')
      .eq('id', commentId)
      .single();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    if (comment) {
      await supabase.rpc('decrement_comments_count', { post_id: comment.post_id });
    }
  }

  private mapCommentsToFrontend(comments: any[]): Comment[] {
    return comments.map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: comment.user.id,
        name: comment.user.display_name,
        avatar: comment.user.avatar_url || 'https://placehold.co/100x100',
        isVerified: comment.user.is_verified,
      },
    }));
  }
}

export const commentService = new CommentService();
