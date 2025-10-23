import { useState } from 'react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SendIcon, CheckCheckIcon, ArrowLeftIcon, UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const chats = [
    {
      id: '1',
      user: { name: 'Anna Schmidt', avatar: 'https://placehold.co/100x100', username: 'annasch' },
      lastMessage: 'Danke für die tollen Inhalte!',
      timestamp: 'vor 5 Min',
      unread: 2,
    },
    {
      id: '2',
      user: { name: 'Max Müller', avatar: 'https://placehold.co/100x100', username: 'maxm' },
      lastMessage: 'Wann kommt der nächste Post?',
      timestamp: 'vor 1 Std',
      unread: 0,
    },
    {
      id: '3',
      user: { name: 'Lisa Weber', avatar: 'https://placehold.co/100x100', username: 'lisaweb' },
      lastMessage: 'Ich liebe deine Arbeit ❤️',
      timestamp: 'vor 2 Std',
      unread: 1,
    },
  ];

  const messages = [
    {
      id: '1',
      text: 'Hallo! Ich bin ein großer Fan!',
      sender: 'user',
      timestamp: '14:30',
    },
    {
      id: '2',
      text: 'Vielen Dank für deine Unterstützung! 💛',
      sender: 'creator',
      timestamp: '14:32',
    },
    {
      id: '3',
      text: 'Danke für die tollen Inhalte!',
      sender: 'user',
      timestamp: '14:35',
    },
{
      id: '4',
      text: 'Hallo! Ich bin ein großer Fan!',
      sender: 'user',
      timestamp: '14:30',
    },
    {
      id: '5',
      text: 'Vielen Dank für deine Unterstützung! 💛',
      sender: 'creator',
      timestamp: '14:32',
    },
    {
      id: '6',
      text: 'Danke für die tollen Inhalte!',
      sender: 'user',
      timestamp: '14:35',
    },
{
      id: '7',
      text: 'Hallo! Ich bin ein großer Fan!',
      sender: 'user',
      timestamp: '14:30',
    },
    {
      id: '8',
      text: 'Vielen Dank für deine Unterstützung! 💛',
      sender: 'creator',
      timestamp: '14:32',
    },
    {
      id: '9',
      text: 'Danke für die tollen Inhalte!',
      sender: 'user',
      timestamp: '14:35',
    },
  ];

  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const handleProfileClick = (username: string) => {
    navigate(`/creator/${username}`);
  };

  const selectedChatData = chats.find((c) => c.id === selectedChat);

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-5xl mx-auto h-full flex flex-col flex-1 p-4">
        <h1 className="text-3xl font-serif text-foreground mb-8 hidden lg:block">Nachrichten</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Chat List */}
          <Card className={`bg-card border-border lg:col-span-1 overflow-hidden ${selectedChat ? 'hidden lg:block' : 'block'}`}>
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedChat === chat.id
                        ? 'bg-secondary/20'
                        : 'hover:bg-neutral'
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.user.avatar} alt={chat.user.name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {chat.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {chat.user.name}
                        </span>
                        {chat.unread > 0 && (
                          <span className="bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {chat.timestamp}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Chat Window */}
          {selectedChat && selectedChatData && (
            <div className={`bg-card border border-border rounded-lg lg:col-span-2 flex flex-col h-full ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
              {/* Fixed Header */}
              <div className="p-4 border-b border-border flex items-center gap-3 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="lg:hidden text-foreground hover:text-secondary hover:bg-neutral"
                >
                  <ArrowLeftIcon className="w-5 h-5" strokeWidth={1.5} />
                </Button>
                <Avatar className="w-10 h-10 cursor-pointer" onClick={() => handleProfileClick(selectedChatData.user.username)}>
                  <AvatarImage src={selectedChatData.user.avatar} alt={selectedChatData.user.name} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {selectedChatData.user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 cursor-pointer" onClick={() => handleProfileClick(selectedChatData.user.username)}>
                  <span className="font-medium text-foreground block">{selectedChatData.user.name}</span>
                  <span className="text-sm text-muted-foreground">@{selectedChatData.user.username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleProfileClick(selectedChatData.user.username)}
                  className="text-foreground hover:text-secondary hover:bg-neutral"
                >
                  <UserIcon className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              </div>

              {/* Scrollable Messages */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[calc(100%-128px)]">
                <div className="space-y-4 flex flex-col">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === 'creator' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sender === 'creator'
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-neutral text-foreground'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs opacity-70">{msg.timestamp}</span>
                          {msg.sender === 'creator' && (
                            <CheckCheckIcon className="w-4 h-4 opacity-70" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fixed Input */}
              <div className="p-4 border-t border-border flex-shrink-0 bg-card">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nachricht schreiben..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    className="bg-background text-foreground border-border"
                  />
                  <Button
                    onClick={handleSend}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                  >
                    <SendIcon className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder */}
          {!selectedChat && (
            <Card className="hidden lg:flex bg-card border-border lg:col-span-2 items-center justify-center">
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
