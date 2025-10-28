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
    isVerified?: boolean; // Optional hinzugefügt
  };
  receiver?: {
    id: string;
    name: string;
    avatar: string;
    isVerified?: boolean; // Optional hinzugefügt
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
  async sendMessage(receiverId: string, content: string): Promise<Database['public']['Tables']['messages']['Row']> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const messageData: MessageInsert = {
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      is_read: false, // Neue Nachrichten sind standardmäßig ungelesen
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to send message'); // Zusätzliche Prüfung

    return data;
  }

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
      .order('created_at', { ascending: true }) // Älteste zuerst für Chat-Anzeige
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return this.mapMessagesToFrontend(messages || []);
  }

  async getChatList(): Promise<Chat[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Hole die *letzte* Nachricht für jede Konversation des aktuellen Benutzers
    // Dies ist komplexer und wird oft serverseitig mit einer View oder Funktion gelöst.
    // Hier eine clientseitige Annäherung: Hole alle Nachrichten und gruppiere sie.
    // **Achtung:** Dies kann bei sehr vielen Nachrichten ineffizient werden!
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
      .order('created_at', { ascending: false }); // Neueste zuerst

    if (error) throw error;

    const chatsMap = new Map<string, ServiceChat>(); // Verwende ServiceChat hier intern

    for (const message of messages || []) {
      const isReceived = message.receiver_id === user.id;
      const otherUserId = isReceived ? message.sender_id : message.receiver_id;
      const otherUser = isReceived ? message.sender : message.receiver;

      // Wenn noch kein Eintrag für diesen Chat existiert, füge ihn hinzu (da nach Zeit sortiert, ist dies die letzte Nachricht)
      if (!chatsMap.has(otherUserId) && otherUser) { // Stelle sicher, dass otherUser existiert
        // Zähle ungelesene Nachrichten für diesen Chat
        const { count: unreadCount, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true }) // effizienteres Zählen
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
          lastMessageTime: message.created_at, // Behalte ISO String
          unreadCount: unreadCount || 0,
        });
      }
    }

    // Konvertiere Map-Werte zu Array und sortiere optional erneut nach Zeit
    return Array.from(chatsMap.values()).sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
}


  async markAsRead(messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('receiver_id', user.id); // Nur als Empfänger markieren

    if (error) throw error;
  }

  async markConversationAsRead(otherUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherUserId) // Nachrichten *vom* anderen User...
      .eq('receiver_id', user.id)   // *an* mich...
      .eq('is_read', false);         // die noch ungelesen sind.

    if (error) throw error;
  }

  // NEUE METHODE: Neue Nachrichten per Polling abrufen
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
      .gt('created_at', sinceTimestamp) // Nur Nachrichten GRÖSSER (neuer) als der Zeitstempel
      .order('created_at', { ascending: true }); // Aufsteigend sortieren

    if (error) {
      console.error("Fehler beim Abrufen neuer Nachrichten:", error);
      throw error;
    }

    // Markiere die neuen Nachrichten direkt als gelesen, wenn sie abgerufen werden
    // (nur die, die an den aktuellen Benutzer gerichtet sind)
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
            // Fehler hier nicht weiterwerfen, damit Nachrichten trotzdem zurückgegeben werden
        }

    }

    return this.mapMessagesToFrontend(messages || []);
  }

  // Hilfsmethode zum Mappen einer einzelnen Nachricht
  private mapSingleMessageToFrontend(msg: any, sender?: any, receiver?: any): Message {
     return {
       id: msg.id,
       senderId: msg.sender_id,
       receiverId: msg.receiver_id,
       content: msg.content,
       isRead: msg.is_read,
       createdAt: msg.created_at, // ISO String
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

  // Mappt ein Array von Datenbankzeilen in das Frontend-Format
  private mapMessagesToFrontend(messages: any[]): Message[] {
    return messages.map(msg => this.mapSingleMessageToFrontend(msg, msg.sender, msg.receiver));
 }
}

// Service Instanz exportieren
export const messageService = new MessageService();