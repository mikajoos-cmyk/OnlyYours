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
// --- FIX: cn importieren ---
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

  useEffect(() => {
      const pollNewMessages = async () => {
          if (!selectedChat?.user.id || !lastMessageTimestampRef.current) {
              return;
          }
          try {
              const newMessages = await messageService.getNewMessages(selectedChat.user.id, lastMessageTimestampRef.current);

              if (newMessages.length > 0) {
                  setMessages(prevMessages => [...prevMessages, ...newMessages]);
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
        setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? { ...optimisticMessage, id: sentMessage.id, createdAt: sentMessage.created_at } : msg));

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
     <div className="flex flex-col h-full w-full">

         <div className="hidden lg:flex items-center justify-between p-4 border-b border-border flex-shrink-0">
           <h1 className="text-2xl font-serif text-foreground">
             Nachrichten
           </h1>
           {currentRole === 'creator' && (
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMassMessageModal(true)}
               >
                  <Send className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Massen-Nachricht
               </Button>
           )}
         </div>

         <div className="flex-1 flex min-h-0 w-full max-w-7xl mx-auto lg:p-4 lg:gap-6">

             <Card className={cn(
                 "bg-card border-border flex flex-col h-full w-full lg:w-1/3 lg:rounded-lg border-0 lg:border",
                 selectedChat ? 'hidden lg:flex' : 'flex'
             )}>
               <div className="p-4 border-b border-border lg:hidden flex justify-between items-center">
                 <h1 className="text-xl font-serif">Nachrichten</h1>
                 {currentRole === 'creator' && (
                    <Button variant="ghost" size="icon" onClick={() => setShowMassMessageModal(true)}>
                        <Send className="w-5 h-5" />
                    </Button>
                 )}
               </div>

               <div className="overflow-y-auto flex-1 chat-messages-scrollbar">
                 {loadingChats && <p className="p-4 text-center text-muted-foreground">Lade Chats...</p>}
                 {!loadingChats && chats.length === 0 && <p className="p-4 text-center text-muted-foreground">Keine Chats.</p>}
                 <div className="p-2 space-y-1">
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
                         <span className="text-xs text-muted-foreground opacity-70">{chat.timestamp}</span>
                       </div>
                     </button>
                   ))}
                 </div>
               </div>
             </Card>

             <div className={cn(
                 "bg-card lg:border border-border lg:rounded-lg lg:flex-1 flex-col h-full overflow-hidden",
                 selectedChat ? 'flex fixed inset-0 z-50 lg:static' : 'hidden lg:flex'
             )}>
                {selectedChat ? (
                 <>
                    <div className="p-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-card">
                        <Button variant="ghost" size="icon" onClick={handleBack} className="lg:hidden">
                            <ArrowLeftIcon className="w-6 h-6" strokeWidth={1.5} />
                        </Button>
                        <Avatar className="w-10 h-10 cursor-pointer" onClick={() => handleProfileClick(selectedChat.user.username)}>
                            <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.name} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground">{selectedChat.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 cursor-pointer" onClick={() => handleProfileClick(selectedChat.user.username)}>
                            <span className="font-medium text-foreground block leading-tight">{selectedChat.user.name}</span>
                            <span className="text-xs text-muted-foreground">@{selectedChat.user.username || 'user'}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 min-h-0 chat-messages-scrollbar bg-background lg:bg-card">
                        {loadingMessages && <p className="text-center text-muted-foreground mt-4">Lade...</p>}
                        {!loadingMessages && messages.length === 0 && <p className="text-center text-muted-foreground mt-4">Schreib die erste Nachricht!</p>}
                        <div className="space-y-3 flex flex-col pb-2">
                            {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={cn(
                                    "max-w-[80%] px-4 py-2 rounded-2xl text-sm",
                                    msg.senderId === currentUser?.id
                                        ? 'bg-secondary text-secondary-foreground rounded-br-sm'
                                        : 'bg-neutral text-foreground rounded-bl-sm'
                                )}>
                                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.senderId === currentUser?.id && <CheckCheckIcon className={cn("w-3 h-3", msg.isRead && "text-blue-400")} />}
                                </div>
                                </div>
                            </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="p-3 border-t border-border flex-shrink-0 bg-card pb-safe">
                        <div className="flex gap-2 items-end">
                            <Input
                            placeholder="Nachricht..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            className="bg-neutral border-transparent focus:border-secondary rounded-full px-4 py-2 min-h-[44px]"
                            disabled={!currentUser}
                            />
                            <Button
                            onClick={handleSend}
                            size="icon"
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full h-11 w-11 flex-shrink-0"
                            disabled={!message.trim() || !currentUser}
                            >
                            <SendIcon className="w-5 h-5 ml-0.5" />
                            </Button>
                        </div>
                    </div>
                 </>
                ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageCircleIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Wähle einen Chat aus, um zu beginnen.</p>
                    </div>
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