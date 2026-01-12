import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { storageService } from './storageService';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatar: string; isVerified?: boolean; };
  receiver?: { id: string; name: string; avatar: string; isVerified?: boolean; };
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

  // VERSCHLÜSSELT SENDEN via RPC
  async sendMessage(receiverId: string, content: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Aufruf der sicheren RPC Funktion
    const { data: messageId, error } = await supabase.rpc('send_encrypted_message', {
      p_sender_id: user.id,
      p_receiver_id: receiverId,
      p_content: content
    });

    if (error) throw error;

    // Fake-Objekt für sofortige UI-Updates zurückgeben
    return {
      id: messageId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content,
      is_read: false,
      created_at: new Date().toISOString()
    };
  }

  // Willkommensnachricht (ebenfalls verschlüsselt via RPC)
  async sendWelcomeMessage(creatorId: string, fanId: string, content: string): Promise<void> {
    const { error } = await supabase.rpc('send_encrypted_message', {
      p_sender_id: creatorId,
      p_receiver_id: fanId,
      p_content: content
    });
    if (error) console.error("Fehler beim Senden der Willkommensnachricht:", error);
  }

  /**
   * NEU: Sendet eine automatische Nachricht im Namen des Creators an den Fan.
   * Nutzt die SQL-Funktion 'send_automated_message'.
   */
  /**
   * DEBUG-VERSION: Automatische Nachricht senden
   */
  async sendAutomatedShopMessage(creatorId: string, fanId: string, productTitle: string) {
    console.log('[MessageService] Sending automated message...', { creatorId, fanId });

    const messageContent = `Vielen Dank für den Kauf von "${productTitle}"! 🎉\n\nBitte antworte mir hier mit deiner Lieferadresse (Name, Straße, PLZ, Ort), damit ich den Versand vorbereiten kann.`;

    // Aufruf der SQL Funktion
    const { error } = await (supabase.rpc as any)('send_automated_message', {
      p_sender_id: creatorId,
      p_receiver_id: fanId,
      p_content: messageContent
    });

    if (error) {
      console.error('[MessageService] RPC Error send_automated_message:', error);
      throw error; // Fehler werfen, damit das Frontend ihn sieht
    }

    console.log('[MessageService] Automated message sent successfully.');
  }

  // ENTSCHLÜSSELT LESEN via View 'decrypted_messages'
  async getConversation(otherUserId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('decrypted_messages') // Nutzt den View!
      .select(`
        *,
        sender:users!sender_id ( id, display_name, avatar_url, is_verified ),
        receiver:users!receiver_id ( id, display_name, avatar_url, is_verified )
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return this.mapMessagesToFrontend(messages || []);
  }

  // Chat-Liste via View (für entschlüsselte Vorschau 'lastMessage')
  async getChatList(): Promise<Chat[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('decrypted_messages')
      .select(`
        *,
        sender:users!sender_id ( id, display_name, avatar_url ),
        receiver:users!receiver_id ( id, display_name, avatar_url )
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const chatsMap = new Map<string, Chat>();
    for (const message of messages || []) {
      const isReceived = message.receiver_id === user.id;
      const otherUserId = isReceived ? message.sender_id : message.receiver_id;
      const otherUser = isReceived ? message.sender : message.receiver;

      if (!chatsMap.has(otherUserId) && otherUser) {
        // Ungelesene Nachrichten zählen (auf der echten Tabelle effizienter)
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        const resolvedAvatar = await storageService.resolveImageUrl(otherUser.avatar_url);

        chatsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.display_name || 'Unbekannt',
          userAvatar: resolvedAvatar,
          lastMessage: message.content, // Ist jetzt entschlüsselt
          lastMessageTime: message.created_at,
          unreadCount: unreadCount || 0,
        });
      }
    }
    return Array.from(chatsMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }

  // Polling für neue Nachrichten (via View)
  async getNewMessages(otherUserId: string, sinceTimestamp: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: messages, error } = await supabase
      .from('decrypted_messages')
      .select(`*, sender:users!sender_id(id, display_name, avatar_url), receiver:users!receiver_id(id, display_name, avatar_url)`)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .gt('created_at', sinceTimestamp)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Als gelesen markieren (auf echter Tabelle)
    const newIds = (messages || []).filter((m: any) => m.receiver_id === user.id && !m.is_read).map((m: any) => m.id);
    if (newIds.length > 0) await supabase.from('messages').update({ is_read: true }).in('id', newIds);

    return this.mapMessagesToFrontend(messages || []);
  }

  async markConversationAsRead(otherUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Update auf echter Tabelle
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', otherUserId).eq('receiver_id', user.id).eq('is_read', false);
  }

  private async mapMessagesToFrontend(messages: any[]): Promise<Message[]> {
    return Promise.all(messages.map(async msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content,
      isRead: msg.is_read,
      createdAt: msg.created_at,
      sender: msg.sender ? {
        id: msg.sender.id,
        name: msg.sender.display_name,
        avatar: await storageService.resolveImageUrl(msg.sender.avatar_url)
      } : undefined,
      receiver: msg.receiver ? {
        id: msg.receiver.id,
        name: msg.receiver.display_name,
        avatar: await storageService.resolveImageUrl(msg.receiver.avatar_url)
      } : undefined,
    })));
  }
}

export const messageService = new MessageService();