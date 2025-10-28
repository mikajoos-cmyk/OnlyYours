import { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SendIcon, CheckCheckIcon, ArrowLeftIcon, UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { messageService } from '../../services/messageService';
import { useAuthStore } from '../../stores/authStore';

// Annahme für Datenstrukturen
interface Chat {
  id: string;
  user: { id: string; name: string; avatar: string; username: string; };
  lastMessage: string;
  timestamp: string;
  unread: number;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'creator';
  timestamp: string;
}

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

  // Lade die Chat-Liste
  useEffect(() => {
    const fetchChatList = async () => {
      try {
        setLoadingChats(true);
        setError(null);
        const chatList = await messageService.getChatList();
        setChats(chatList || []);
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
    if (!selectedChat) return;

    const fetchConversation = async () => {
      try {
        setLoadingMessages(true);
        setError(null);
        const conversation = await messageService.getConversation(selectedChat.user.id);
        setMessages(conversation || []);
        setTimeout(scrollToBottom, 100); // Scrollen nach dem Laden
      } catch (err) {
        setError('Fehler beim Laden der Nachrichten.');
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchConversation();
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (message.trim() && selectedChat && currentUser) {
      const newMessage: Message = {
        id: Date.now().toString(), // Temporäre ID
        text: message,
        sender: 'creator', // Annahme: Der aktuelle Benutzer ist der Creator
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, newMessage]);
      setMessage('');
      setTimeout(scrollToBottom, 100);

      try {
        await messageService.sendMessage(selectedChat.user.id, message);
        // Optional: Man könnte die Nachrichten neu laden, um die finale ID zu bekommen,
        // aber für eine optimistische UI ist das oft nicht nötig.
      } catch (err) {
        console.error('Fehler beim Senden der Nachricht:', err);
        // UI zurücksetzen, falls das Senden fehlschlägt
        setMessages(prev => prev.filter(m => m.id !== newMessage.id));
        setError('Nachricht konnte nicht gesendet werden.');
      }
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const handleProfileClick = (username: string) => {
    navigate(`/creator/${username}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 p-4 min-h-0">
        <h1 className="text-3xl font-serif text-foreground mb-8 hidden lg:block flex-shrink-0">Nachrichten</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <Card className={`bg-card border-border lg:col-span-1 overflow-hidden ${selectedChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'} h-full`}>
            <div className="overflow-y-auto flex-1 chat-messages-scrollbar">
              {loadingChats && <p className="p-4">Lade Chats...</p>}
              {error && <p className="p-4 text-destructive">{error}</p>}
              {!loadingChats && !error && chats.length === 0 && <p className="p-4">Keine Chats vorhanden.</p>}
              <div className="p-4 space-y-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedChat?.id === chat.id ? 'bg-secondary/20' : 'hover:bg-neutral'}`}>
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

          {selectedChat && (
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
                  <span className="text-sm text-muted-foreground">@{selectedChat.user.username}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleProfileClick(selectedChat.user.username)} className="text-foreground hover:text-secondary hover:bg-neutral">
                  <UserIcon className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 min-h-0 chat-messages-scrollbar">
                {loadingMessages && <p>Lade Nachrichten...</p>}
                {!loadingMessages && messages.length === 0 && <p className="text-center text-muted-foreground">Beginne eine neue Konversation.</p>}
                <div className="space-y-4 flex flex-col">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'creator' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] lg:max-w-[65%] px-4 py-2 rounded-lg ${msg.sender === 'creator' ? 'bg-secondary text-secondary-foreground rounded-br-none' : 'bg-neutral text-foreground rounded-bl-none'}`}>
                        <p className="break-words">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'creator' && <CheckCheckIcon className="w-4 h-4" strokeWidth={1.5} />}
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
                  />
                  <Button onClick={handleSend} size="icon" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal flex-shrink-0">
                    <SendIcon className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!selectedChat && (
            <Card className="hidden lg:flex bg-card border-border lg:col-span-2 items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>Wählen Sie eine Konversation aus</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}