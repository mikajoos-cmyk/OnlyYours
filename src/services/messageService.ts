// src/services/messageService.ts
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Interface für die Frontend-Nachricht (mit optionalen Sender/Empfänger-Details)
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string; // ISO String Format
  sender?: {
    id: string;
    name: string;
    avatar: string;
    isVerified?: boolean;
  };
  receiver?: {
    id: string;
    name: string;
    avatar: string;
    isVerified?: boolean;
  };
}

// Interface für die Chat-Übersicht (von getChatList zurückgegeben)
export interface Chat {
  userId: string; // ID des Chatpartners
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string; // ISO String Format
  unreadCount: number;
}

export class MessageService {
  /**
   * Sendet eine Standardnachricht vom *aktuell angemeldeten Benutzer*.
   */
  async sendMessage(receiverId: string, content: string): Promise<Database['public']['Tables']['messages']['Row']> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const messageData: MessageInsert = {
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      is_read: false,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to send message');

    return data;
  }

  // --- NEUE FUNKTION ---
  /**
   * Sendet eine Willkommensnachricht VOM CREATOR AN DEN FAN.
   * Diese Funktion wird vom FAN aufgerufen, direkt nachdem er abonniert hat.
   * Die RLS-Policy (siehe Migration) prüft, ob der Aufrufer (Fan)
   * tatsächlich ein Abo beim Sender (Creator) hat.
   */
  async sendWelcomeMessage(creatorId: string, fanId: string, content: string): Promise<void> {
    console.log(`[MessageService] Sende Willkommensnachricht von ${creatorId} an ${fanId}`);

    // WICHTIG: Hier ist sender_id der Creator und receiver_id der Fan
    const messageData: MessageInsert = {
      sender_id: creatorId,
      receiver_id: fanId,
      content,
      is_read: false, // Ist für den Fan (Empfänger) ungelesen
    };

    // Der angemeldete Benutzer ist der Fan (receiver_id).
    // Die RLS-Policy prüft: auth.uid() == receiver_id UND ob Abo für sender_id existiert.
    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (error) {
      console.error("Fehler beim Senden der Willkommensnachricht:", error);
      // Wir werfen den Fehler nicht unbedingt weiter,
      // damit der Abo-Vorgang nicht fehlschlägt, nur weil die Nachricht scheitert.
    } else {
      console.log("Willkommensnachricht erfolgreich gesendet.");
    }
  }
  // --- ENDE NEUE FUNKTION ---


  async getConversation(otherUserId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          display_name,
          avatar_url,
          is_verified
        ),
        receiver:users!receiver_id (
          id,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return this.mapMessagesToFrontend(messages || []);
  }

  async getChatList(): Promise<Chat[]> {
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

      if (!chatsMap.has(otherUserId) && otherUser) {
        const { count: unreadCount, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (countError) {
          console.error(`Fehler beim Zählen ungelesener Nachrichten für ${otherUserId}:`, countError);
        }

        chatsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.display_name || 'Unbekannt',
          userAvatar: otherUser.avatar_url || 'https://placehold.co/100x100',
          lastMessage: message.content,
          lastMessageTime: message.created_at,
          unreadCount: unreadCount || 0,
        });
      }
    }

    return Array.from(chatsMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
}


  async markAsRead(messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('receiver_id', user.id);

    if (error) throw error;
  }

  async markConversationAsRead(otherUserId: string): Promise<void> {
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

  async getNewMessages(otherUserId: string, sinceTimestamp: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          display_name,
          avatar_url,
          is_verified
        ),
        receiver:users!receiver_id (
          id,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .gt('created_at', sinceTimestamp)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Fehler beim Abrufen neuer Nachrichten:", error);
      throw error;
    }

    const newReceivedMessageIds = (messages || [])
        .filter(msg => msg.receiver_id === user.id && !msg.is_read)
        .map(msg => msg.id);

    if (newReceivedMessageIds.length > 0) {
        try {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .in('id', newReceivedMessageIds);
        } catch (updateError) {
            console.error("Fehler beim Markieren neuer Nachrichten als gelesen:", updateError);
        }

    }

    return this.mapMessagesToFrontend(messages || []);
  }

  private mapSingleMessageToFrontend(msg: any, sender?: any, receiver?: any): Message {
     return {
       id: msg.id,
       senderId: msg.sender_id,
       receiverId: msg.receiver_id,
       content: msg.content,
       isRead: msg.is_read,
       createdAt: msg.created_at,
       sender: sender ? {
         id: sender.id,
         name: sender.display_name || 'Unbekannt',
         avatar: sender.avatar_url || 'https://placehold.co/100x100',
         isVerified: sender.is_verified || false
       } : undefined,
       receiver: receiver ? {
         id: receiver.id,
         name: receiver.display_name || 'Unbekannt',
         avatar: receiver.avatar_url || 'https://placehold.co/100x100',
         isVerified: receiver.is_verified || false
       } : undefined,
     };
  }

  private mapMessagesToFrontend(messages: any[]): Message[] {
    return messages.map(msg => this.mapSingleMessageToFrontend(msg, msg.sender, msg.receiver));
 }
}

export const messageService = new MessageService();