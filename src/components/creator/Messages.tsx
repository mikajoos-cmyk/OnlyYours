// src/components/creator/Messages.tsx
import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
// MessageCircleIcon importieren, falls noch nicht geschehen
import { SendIcon, CheckCheckIcon, ArrowLeftIcon, UserIcon, MessageCircleIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { messageService, Message, Chat as ServiceChat } from '../../services/messageService';
import { useAuthStore } from '../../stores/authStore';
// import { RealtimeChannel } from '@supabase/supabase-js'; // Entfernt

// ... (Interface Chat bleibt gleich)

const POLLING_INTERVAL = 5000; // Abfrage alle 5 Sekunden

export default function Messages() {
  const { user: currentUser } = useAuthStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  // Ref für den letzten Zeitstempel
  const lastMessageTimestampRef = useRef<string | null>(null);
  // Ref für das Interval-Handle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Lade die Chat-Liste (bleibt gleich)
  useEffect(() => {
    const fetchChatList = async () => {
      try {
        setLoadingChats(true);
        setError(null);
        const chatList = await messageService.getChatList();
        const formattedChats = chatList.map(c => ({
          id: c.userId,
          user: { id: c.userId, name: c.userName, avatar: c.userAvatar, username: c.userName /* Annahme */ },
          lastMessage: c.lastMessage,
          // Formatierung des Zeitstempels hier oder direkt bei der Anzeige
          timestamp: new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: c.unreadCount
        }));
        setChats(formattedChats || []);
      } catch (err) {
        setError('Fehler beim Laden der Chats.');
        console.error(err);
      } finally {
        setLoadingChats(false);
      }
    };
    fetchChatList();
  }, []); // Nur beim initialen Mount laden

  // Lade Nachrichten, wenn ein Chat ausgewählt wird
  useEffect(() => {
    if (!selectedChat?.user.id) return;

    const fetchConversation = async () => {
      try {
        setLoadingMessages(true);
        setError(null);
        const conversation = await messageService.getConversation(selectedChat.user.id);
        setMessages(conversation || []);
        // Setze den letzten Zeitstempel für das Polling
        if (conversation && conversation.length > 0) {
          lastMessageTimestampRef.current = conversation[conversation.length - 1].createdAt;
        } else {
          lastMessageTimestampRef.current = new Date(0).toISOString(); // Falls keine Nachrichten da sind, starte von Anfang an
        }
        setTimeout(scrollToBottom, 100);
        // Markiere Konversation als gelesen
        await messageService.markConversationAsRead(selectedChat.user.id);
        setChats(prevChats => prevChats.map(chat =>
          chat.id === selectedChat.user.id ? { ...chat, unread: 0 } : chat
        ));
      } catch (err) {
        setError('Fehler beim Laden der Nachrichten.');
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchConversation();
  }, [selectedChat?.user.id]);

  // Effekt für Realtime-Subscription entfernt
  /*
  useEffect(() => {
    // ... alter Realtime Code ...
  }, [currentUser?.id, selectedChat]);
  */

  // NEU: Effekt für Polling
  useEffect(() => {
      // Funktion zum Abrufen neuer Nachrichten
      const pollNewMessages = async () => {
          if (!selectedChat?.user.id || !lastMessageTimestampRef.current) {
              return; // Nicht pollen, wenn kein Chat offen ist oder kein Zeitstempel existiert
          }
          try {
              console.log(`Polling für neue Nachrichten seit ${lastMessageTimestampRef.current}...`);
              const newMessages = await messageService.getNewMessages(selectedChat.user.id, lastMessageTimestampRef.current);

              if (newMessages.length > 0) {
                  console.log(`${newMessages.length} neue Nachrichten empfangen.`);
                  setMessages(prevMessages => [...prevMessages, ...newMessages]);
                  // Aktualisiere den letzten Zeitstempel
                  lastMessageTimestampRef.current = newMessages[newMessages.length - 1].createdAt;
                  setTimeout(scrollToBottom, 100); // Scrollen bei neuen Nachrichten

                    // Optional: Aktualisiere Chatliste (redundant, da getNewMessages es schon macht?)
                    const latestMsg = newMessages[newMessages.length - 1];
                    setChats(prevChats => {
                        const chatIndex = prevChats.findIndex(c => c.id === selectedChat.user.id);
                        if (chatIndex > -1) {
                            const updatedChat = {
                                ...prevChats[chatIndex],
                                lastMessage: latestMsg.content,
                                timestamp: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                unread: 0 // Da der Chat offen ist
                            };
                            return [updatedChat, ...prevChats.slice(0, chatIndex), ...prevChats.slice(chatIndex + 1)];
                        }
                        return prevChats;
                    });
              } else {
                  console.log("Keine neuen Nachrichten.");
              }
          } catch (error) {
              console.error('Fehler beim Pollen neuer Nachrichten:', error);
              // Hier könntest du einen Fehler im UI anzeigen oder das Polling pausieren
          }
      };

      // Starte das Polling nur, wenn ein Chat ausgewählt ist
      if (selectedChat?.user.id) {
          // Lösche vorheriges Interval, falls vorhanden
          if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
          }
          // Starte neues Interval
          pollingIntervalRef.current = setInterval(pollNewMessages, POLLING_INTERVAL);
          console.log(`Polling gestartet für Chat mit ${selectedChat.user.id}. Intervall: ${POLLING_INTERVAL}ms`);
      }

      // Cleanup-Funktion: Interval stoppen
      return () => {
          if (pollingIntervalRef.current) {
              console.log("Polling wird gestoppt.");
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
          }
      };
  // Abhängigkeiten: selectedChat (um das Polling zu starten/stoppen)
  }, [selectedChat?.user.id]); // Nur neu starten/stoppen, wenn sich der Chat ändert


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (message.trim() && selectedChat && currentUser) {
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: currentUser.id,
        receiverId: selectedChat.user.id,
        content: message.trim(),
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          name: currentUser.name || 'Ich',
          avatar: currentUser.avatar || '',
          isVerified: currentUser.isVerified || false
        },
      };

      setMessages(prev => [...prev, optimisticMessage]);
      const messageToSend = message.trim();
      setMessage('');
      setTimeout(scrollToBottom, 100);

      // Aktualisiere Chat-Liste optimistisch (bleibt gleich)
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => c.id === selectedChat.user.id);
        if (chatIndex > -1) {
            const updatedChat = {
                ...prevChats[chatIndex],
                lastMessage: optimisticMessage.content,
                timestamp: new Date(optimisticMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                unread: 0
            };
            return [updatedChat, ...prevChats.slice(0, chatIndex), ...prevChats.slice(chatIndex + 1)];
        }
        return prevChats;
      });

      try {
        const sentMessage = await messageService.sendMessage(selectedChat.user.id, messageToSend);
        // Aktualisiere den Zeitstempel-Ref nach erfolgreichem Senden
        // Das ist wichtig, damit das nächste Polling diese Nachricht nicht erneut holt
        lastMessageTimestampRef.current = sentMessage.created_at;

        // Optional: Ersetze die optimistische Nachricht durch die echte, falls IDs wichtig sind
        setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? { ...optimisticMessage, id: sentMessage.id, createdAt: sentMessage.created_at } : msg));

      } catch (err) {
        console.error('Fehler beim Senden der Nachricht:', err);
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setError('Nachricht konnte nicht gesendet werden.');
        // Chat-Listen-Rollback ist hier komplexer, erstmal weglassen
      }
    }
  };

  const handleChatSelect = (chat: Chat) => {
    if (selectedChat?.id === chat.id) return;
    setMessages([]);
    lastMessageTimestampRef.current = null; // Zeitstempel zurücksetzen
    setSelectedChat(chat);
    // Das Polling wird durch den useEffect-Hook automatisch neu gestartet
  };

  const handleBack = () => {
    setSelectedChat(null);
    setMessages([]);
    lastMessageTimestampRef.current = null; // Zeitstempel zurücksetzen
    // Das Polling wird durch den useEffect-Hook automatisch gestoppt
  };

  const handleProfileClick = (username: string | undefined) => {
    if (selectedChat?.user.id) {
        navigate(`/profile/${selectedChat.user.id}`);
    } else {
        console.warn("Keine User-ID zum Navigieren verfügbar.");
    }
  };


  return (
    // ... (Der JSX-Code bleibt genau gleich wie in der vorherigen Antwort) ...
     <div className="flex flex-col h-full">
         <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 p-4 min-h-0">
           <h1 className="text-3xl font-serif text-foreground mb-8 hidden lg:block flex-shrink-0">Nachrichten</h1>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

             <Card className={`bg-card border-border lg:col-span-1 overflow-hidden ${selectedChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'} h-full`}>
               <div className="overflow-y-auto flex-1 chat-messages-scrollbar">
                 {loadingChats && <p className="p-4 text-center text-muted-foreground">Lade Chats...</p>}
                 {error && !loadingChats && <p className="p-4 text-destructive">{error}</p>}
                 {!loadingChats && !error && chats.length === 0 && <p className="p-4 text-center text-muted-foreground">Keine Chats vorhanden.</p>}
                 <div className="p-4 space-y-2">
                   {chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((chat) => (
                     <button
                       key={chat.id}
                       onClick={() => handleChatSelect(chat)}
                       className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedChat?.user.id === chat.user.id ? 'bg-secondary/20' : 'hover:bg-neutral'}`}>
                       <Avatar className="w-12 h-12 flex-shrink-0">
                         <AvatarImage src={chat.user.avatar} alt={chat.user.name} />
                         <AvatarFallback className="bg-secondary text-secondary-foreground">{chat.user.name.charAt(0)}</AvatarFallback>
                       </Avatar>
                       <div className="flex-1 text-left min-w-0">
                         <div className="flex items-center justify-between">
                           <span className="font-medium text-foreground truncate">{chat.user.name}</span>
                           {chat.unread > 0 && <span className="bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{chat.unread}</span>}
                         </div>
                         <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                         <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                       </div>
                     </button>
                   ))}
                 </div>
               </div>
             </Card>

             {selectedChat ? (
               <div className={`bg-card border border-border rounded-lg lg:col-span-2 flex flex-col h-full overflow-hidden ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
                 <div className="p-4 border-b border-border flex items-center gap-3 flex-shrink-0">
                   <Button variant="ghost" size="icon" onClick={handleBack} className="lg:hidden text-foreground hover:text-secondary hover:bg-neutral">
                     <ArrowLeftIcon className="w-5 h-5" strokeWidth={1.5} />
                   </Button>
                   <Avatar className="w-10 h-10 cursor-pointer" onClick={() => handleProfileClick(selectedChat.user.username)}>
                     <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.name} />
                     <AvatarFallback className="bg-secondary text-secondary-foreground">{selectedChat.user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1 cursor-pointer" onClick={() => handleProfileClick(selectedChat.user.username)}>
                     <span className="font-medium text-foreground block">{selectedChat.user.name}</span>
                     {selectedChat.user.username && <span className="text-sm text-muted-foreground">@{selectedChat.user.username}</span>}
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => handleProfileClick(selectedChat.user.username)} className="text-foreground hover:text-secondary hover:bg-neutral">
                     <UserIcon className="w-5 h-5" strokeWidth={1.5} />
                   </Button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 min-h-0 chat-messages-scrollbar">
                   {loadingMessages && <p className="text-center text-muted-foreground">Lade Nachrichten...</p>}
                   {error && loadingMessages && <p className="p-4 text-destructive">{error}</p>}
                   {!loadingMessages && messages.length === 0 && <p className="text-center text-muted-foreground">Beginne eine neue Konversation.</p>}
                   <div className="space-y-4 flex flex-col">
                     {messages.map((msg) => (
                       <div key={msg.id} className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[75%] lg:max-w-[65%] px-4 py-2 rounded-lg ${msg.senderId === currentUser?.id ? 'bg-secondary text-secondary-foreground rounded-br-none' : 'bg-neutral text-foreground rounded-bl-none'}`}>
                           <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                           <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                             <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             {msg.senderId === currentUser?.id && <CheckCheckIcon className={`w-4 h-4 ${msg.isRead ? 'text-blue-400' : ''}`} strokeWidth={1.5} />}
                           </div>
                         </div>
                       </div>
                     ))}
                     <div ref={messagesEndRef} />
                   </div>
                 </div>

                 <div className="p-4 border-t border-border flex-shrink-0 bg-card">
                   <div className="flex gap-2">
                     <Input
                       placeholder="Nachricht schreiben..."
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                       onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                       className="bg-background text-foreground border-border"
                       disabled={!currentUser}
                     />
                     <Button
                       onClick={handleSend}
                       size="icon"
                       className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal flex-shrink-0"
                       disabled={!message.trim() || !currentUser}
                       >
                       <SendIcon className="w-5 h-5" strokeWidth={1.5} />
                     </Button>
                   </div>
                 </div>
               </div>
             ) : (
                <Card className="hidden lg:flex bg-card border-border lg:col-span-2 items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageCircleIcon className="w-12 h-12 mx-auto mb-4" strokeWidth={1}/>
                    <p>Wähle eine Konversation aus</p>
                  </div>
                </Card>
              )}
           </div>
         </div>
       </div>
  );
}