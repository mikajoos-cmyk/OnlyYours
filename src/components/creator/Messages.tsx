// src/components/creator/Messages.tsx
import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SendIcon, CheckCheckIcon, ArrowLeftIcon, UserIcon, MessageCircleIcon, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { messageService, Message, Chat as ServiceChat } from '../../services/messageService';
import { useAuthStore } from '../../stores/authStore';
import MassMessageModal from './MassMessageModal';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';

interface Chat {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    username?: string;
  };
  lastMessage: string;
  timestamp: string;
  unread: number;
}

const POLLING_INTERVAL = 5000;

export default function Messages() {
  const { user: currentUser } = useAuthStore();
  const { currentRole } = useAppStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showMassMessageModal, setShowMassMessageModal] = useState(false);

  // State für Tastatur-Erkennung, um Padding unten zu steuern
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = () => {
       setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            setIsKeyboardOpen(false);
        }
      }, 100);
    };
    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Lade die Chat-Liste
  useEffect(() => {
    const fetchChatList = async () => {
      try {
        setLoadingChats(true);
        setError(null);
        const chatList = await messageService.getChatList();
        const formattedChats = chatList.map(c => ({
          id: c.userId,
          user: { id: c.userId, name: c.userName, avatar: c.userAvatar, username: c.userName },
          lastMessage: c.lastMessage,
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
  }, []);

  // Lade Nachrichten, wenn ein Chat ausgewählt wird
  useEffect(() => {
    if (!selectedChat?.user.id) return;

    const fetchConversation = async () => {
      try {
        setLoadingMessages(true);
        setError(null);
        const conversation = await messageService.getConversation(selectedChat.user.id);
        setMessages(conversation || []);
        if (conversation && conversation.length > 0) {
          lastMessageTimestampRef.current = conversation[conversation.length - 1].createdAt;
        } else {
          lastMessageTimestampRef.current = new Date(0).toISOString();
        }
        setTimeout(scrollToBottom, 100);
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

  // Effekt für Polling
  useEffect(() => {
      const pollNewMessages = async () => {
          if (!selectedChat?.user.id || !lastMessageTimestampRef.current) {
              return;
          }
          try {
              const newMessages = await messageService.getNewMessages(selectedChat.user.id, lastMessageTimestampRef.current);

              if (newMessages.length > 0) {
                  // FIX 1: Duplikate vermeiden beim Polling
                  setMessages(prevMessages => {
                      const existingIds = new Set(prevMessages.map(m => m.id));
                      const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

                      if (uniqueNewMessages.length === 0) return prevMessages;
                      return [...prevMessages, ...uniqueNewMessages];
                  });

                  lastMessageTimestampRef.current = newMessages[newMessages.length - 1].createdAt;
                  setTimeout(scrollToBottom, 100);

                    const latestMsg = newMessages[newMessages.length - 1];
                    setChats(prevChats => {
                        const chatIndex = prevChats.findIndex(c => c.id === selectedChat.user.id);
                        if (chatIndex > -1) {
                            const updatedChat = {
                                ...prevChats[chatIndex],
                                lastMessage: latestMsg.content,
                                timestamp: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                unread: 0
                            };
                            return [updatedChat, ...prevChats.slice(0, chatIndex), ...prevChats.slice(chatIndex + 1)];
                        }
                        return prevChats;
                    });
              }
          } catch (error) {
              console.error('Fehler beim Pollen neuer Nachrichten:', error);
          }
      };

      if (selectedChat?.user.id) {
          if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
          }
          pollingIntervalRef.current = setInterval(pollNewMessages, POLLING_INTERVAL);
      }
      return () => {
          if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
          }
      };
  }, [selectedChat?.user.id]);


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
        lastMessageTimestampRef.current = sentMessage.created_at;

        // FIX 2: Race Condition behandeln
        setMessages(prev => {
            // Prüfen, ob die Nachricht in der Zwischenzeit durch Polling hinzugefügt wurde
            const alreadyExists = prev.some(msg => msg.id === sentMessage.id);

            if (alreadyExists) {
                // Wenn sie schon da ist, entferne die optimistische (temp) Nachricht, um Duplikate zu vermeiden
                return prev.filter(msg => msg.id !== optimisticMessage.id);
            }

            // Andernfalls: Update die optimistische Nachricht mit der echten ID
            return prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? { ...optimisticMessage, id: sentMessage.id, createdAt: sentMessage.created_at }
                    : msg
            );
        });

      } catch (err) {
        console.error('Fehler beim Senden der Nachricht:', err);
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setError('Nachricht konnte nicht gesendet werden.');
      }
    }
  };

  const handleChatSelect = (chat: Chat) => {
    if (selectedChat?.id === chat.id) return;
    setMessages([]);
    lastMessageTimestampRef.current = null;
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
    setMessages([]);
    lastMessageTimestampRef.current = null;
  };

  const handleProfileClick = (username: string | undefined) => {
    const targetUsername = username || selectedChat?.user.id;
    if (targetUsername) {
        navigate(`/profile/${targetUsername}`);
    }
  };

  return (
     <div className={cn(
       "flex flex-col h-full",
       // WICHTIG: Padding unten hinzufügen, damit BottomNav nicht das Inputfeld verdeckt.
       // Aber nur, wenn Tastatur NICHT offen ist (da BottomNav dann ausgeblendet wird).
       !isKeyboardOpen && "pb-16 lg:pb-0"
     )}>
         {/* Container: p-0 auf Mobile um Platz zu sparen, p-4 auf Desktop */}
         <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 p-0 lg:p-4 min-h-0">

           {/* Header Bereich - p-4 hinzufügen, da Container p-0 hat */}
           <div className={cn(
             "flex items-center justify-between flex-shrink-0 px-4 pt-4 lg:px-0 lg:pt-0",
             selectedChat ? "hidden lg:flex lg:mb-8" : "mb-4 lg:mb-8"
           )}>
             <h1 className="text-3xl font-serif text-foreground hidden lg:block">
               Nachrichten
             </h1>

             {currentRole === 'creator' && (
               <Button
                  variant="outline"
                  className="bg-card text-foreground border-border hover:bg-neutral font-normal hidden lg:flex"
                  onClick={() => setShowMassMessageModal(true)}
               >
                  <Send className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Massen-Nachricht senden
               </Button>
             )}

             {currentRole === 'creator' && !selectedChat && (
                <Button
                    variant="outline"
                    className="bg-card text-foreground border-border hover:bg-neutral font-normal lg:hidden w-full"
                    onClick={() => setShowMassMessageModal(true)}
                >
                    <Send className="w-5 h-5 mr-2" strokeWidth={1.5} />
                    Massen-Nachricht
                </Button>
             )}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6 flex-1 min-h-0">

             {/* Chat Liste */}
             <Card className={cn(
               "bg-card border-border lg:col-span-1 overflow-hidden flex flex-col h-full",
               // Auf Mobile: border und rounded entfernen für full-screen feel
               "border-x-0 border-b-0 rounded-none lg:border lg:rounded-lg",
               selectedChat ? 'hidden lg:flex' : 'flex'
             )}>
               <div className="overflow-y-auto flex-1 chat-messages-scrollbar">
                 {loadingChats && <p className="p-4 text-center text-muted-foreground">Lade Chats...</p>}
                 {error && !loadingChats && <p className="p-4 text-destructive">{error}</p>}
                 {!loadingChats && !error && chats.length === 0 && <p className="p-4 text-center text-muted-foreground">Keine Chats vorhanden.</p>}
                 <div className="p-2 lg:p-4 space-y-2">
                   {chats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((chat) => (
                     <button
                       key={chat.id}
                       onClick={() => handleChatSelect(chat)}
                       className={cn(
                         "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                         selectedChat?.user.id === chat.user.id ? 'bg-secondary/20' : 'hover:bg-neutral'
                       )}>
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

             {/* Chat Fenster */}
             {selectedChat ? (
               <div className={cn(
                 "bg-card border-border lg:col-span-2 flex-col h-full overflow-hidden",
                 // Mobile Styling Anpassungen
                 "border-0 rounded-none lg:border lg:rounded-lg",
                 selectedChat ? 'flex' : 'hidden lg:flex'
               )}>
                 {/* Chat Header - Kompakter auf Mobile */}
                 <div className="p-2 lg:p-4 border-b border-border flex items-center gap-3 flex-shrink-0 bg-card/95 backdrop-blur z-10">
                   <Button variant="ghost" size="icon" onClick={handleBack} className="lg:hidden text-foreground hover:text-secondary hover:bg-neutral">
                     <ArrowLeftIcon className="w-5 h-5" strokeWidth={1.5} />
                   </Button>
                   <Avatar className="w-8 h-8 lg:w-10 lg:h-10 cursor-pointer" onClick={() => handleProfileClick(selectedChat.user.username)}>
                     <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.name} />
                     <AvatarFallback className="bg-secondary text-secondary-foreground">{selectedChat.user.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1 cursor-pointer min-w-0" onClick={() => handleProfileClick(selectedChat.user.username)}>
                     <span className="font-medium text-foreground block truncate">{selectedChat.user.name}</span>
                     {selectedChat.user.username && <span className="text-xs lg:text-sm text-muted-foreground truncate">@{selectedChat.user.username}</span>}
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => handleProfileClick(selectedChat.user.username)} className="text-foreground hover:text-secondary hover:bg-neutral">
                     <UserIcon className="w-5 h-5" strokeWidth={1.5} />
                   </Button>
                 </div>

                 {/* Nachrichten Liste */}
                 <div className="flex-1 overflow-y-auto p-2 lg:p-4 min-h-0 chat-messages-scrollbar bg-neutral/5">
                   {loadingMessages && <p className="text-center text-muted-foreground mt-4">Lade Nachrichten...</p>}
                   {error && loadingMessages && <p className="p-4 text-destructive text-center">{error}</p>}
                   {!loadingMessages && messages.length === 0 && <p className="text-center text-muted-foreground mt-10">Beginne eine neue Konversation.</p>}
                   <div className="space-y-4 flex flex-col pb-2">
                     {messages.map((msg) => (
                       <div key={msg.id} className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] lg:max-w-[65%] px-3 py-2 lg:px-4 lg:py-2 rounded-2xl ${msg.senderId === currentUser?.id ? 'bg-secondary text-secondary-foreground rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none'}`}>
                           <p className="break-words whitespace-pre-wrap text-sm lg:text-base">{msg.content}</p>
                           <div className="flex items-center justify-end gap-1 mt-1 text-[10px] lg:text-xs opacity-70">
                             <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             {msg.senderId === currentUser?.id && <CheckCheckIcon className={`w-3 h-3 lg:w-4 lg:h-4 ${msg.isRead ? 'text-blue-600' : ''}`} strokeWidth={1.5} />}
                           </div>
                         </div>
                       </div>
                     ))}
                     <div ref={messagesEndRef} />
                   </div>
                 </div>

                 {/* Input Bereich */}
                 <div className="p-2 lg:p-4 border-t border-border flex-shrink-0 bg-card safe-area-pb">
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

         {currentRole === 'creator' && (
           <MassMessageModal
             isOpen={showMassMessageModal}
             onClose={() => setShowMassMessageModal(false)}
           />
         )}

       </div>
  );
}