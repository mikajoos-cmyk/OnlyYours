import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatar: string;
  };
  receiver?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export interface Chat {
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export class MessageService {
  async sendMessage(receiverId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const messageData: MessageInsert = {
      sender_id: user.id,
      receiver_id: receiverId,
      content,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async getConversation(otherUserId: string, limit: number = 50, offset: number = 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          display_name,
          avatar_url
        ),
        receiver:users!receiver_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return this.mapMessagesToFrontend(messages || []);
  }

  async getChatList() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          display_name,
          avatar_url
        ),
        receiver:users!receiver_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const chatsMap = new Map<string, Chat>();

    for (const message of messages || []) {
      const isReceived = message.receiver_id === user.id;
      const otherUserId = isReceived ? message.sender_id : message.receiver_id;
      const otherUser = isReceived ? message.sender : message.receiver;

      if (!chatsMap.has(otherUserId)) {
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        chatsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.display_name,
          userAvatar: otherUser.avatar_url || 'https://placehold.co/100x100',
          lastMessage: message.content,
          lastMessageTime: message.created_at,
          unreadCount: unreadMessages?.length || 0,
        });
      }
    }

    return Array.from(chatsMap.values());
  }

  async markAsRead(messageId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('receiver_id', user.id);

    if (error) throw error;
  }

  async markConversationAsRead(otherUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  }

  private mapMessagesToFrontend(messages: any[]): Message[] {
    return messages.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content,
      isRead: msg.is_read,
      createdAt: msg.created_at,
      sender: msg.sender ? {
        id: msg.sender.id,
        name: msg.sender.display_name,
        avatar: msg.sender.avatar_url || 'https://placehold.co/100x100',
      } : undefined,
      receiver: msg.receiver ? {
        id: msg.receiver.id,
        name: msg.receiver.display_name,
        avatar: msg.receiver.avatar_url || 'https://placehold.co/100x100',
      } : undefined,
    }));
  }
}

export const messageService = new MessageService();
