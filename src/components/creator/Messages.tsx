import { useState, useRef, useEffect } from 'react'; // useEffect importieren
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
  const messagesEndRef = useRef<null | HTMLDivElement>(null); // Ref für Autoscroll

  const chats = [
    // ... (deine Chat-Liste bleibt unverändert)
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
     {
      id: '4',
      user: { name: 'Anna Schmidt', avatar: 'https://placehold.co/100x100', username: 'annasch' },
      lastMessage: 'Danke für die tollen Inhalte!',
      timestamp: 'vor 5 Min',
      unread: 2,
    },
    {
      id: '5',
      user: { name: 'Max Müller', avatar: 'https://placehold.co/100x100', username: 'maxm' },
      lastMessage: 'Wann kommt der nächste Post?',
      timestamp: 'vor 1 Std',
      unread: 0,
    },
    {
      id: '6',
      user: { name: 'Lisa Weber', avatar: 'https://placehold.co/100x100', username: 'lisaweb' },
      lastMessage: 'Ich liebe deine Arbeit ❤️',
      timestamp: 'vor 2 Std',
      unread: 1,
    },
     {
      id: '7',
      user: { name: 'Anna Schmidt', avatar: 'https://placehold.co/100x100', username: 'annasch' },
      lastMessage: 'Danke für die tollen Inhalte!',
      timestamp: 'vor 5 Min',
      unread: 2,
    },
    {
      id: '8',
      user: { name: 'Max Müller', avatar: 'https://placehold.co/100x100', username: 'maxm' },
      lastMessage: 'Wann kommt der nächste Post?',
      timestamp: 'vor 1 Std',
      unread: 0,
    },
    {
      id: '9',
      user: { name: 'Lisa Weber', avatar: 'https://placehold.co/100x100', username: 'lisaweb' },
      lastMessage: 'Ich liebe deine Arbeit ❤️',
      timestamp: 'vor 2 Std',
      unread: 1,
    },
  ];

  const messages = [
     // ... (deine Nachrichtenliste bleibt unverändert)
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

  // Funktion zum automatischen Scrollen zum Ende
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Autoscroll beim Laden und bei neuen Nachrichten (falls implementiert)
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]); // Scrollt, wenn sich die Nachrichten oder der ausgewählte Chat ändern


  const handleSend = () => {
    if (message.trim()) {
      // Hier Logik zum Senden der Nachricht einfügen
      console.log('Nachricht gesendet:', message);
      setMessage('');
      // Ggf. neue Nachrichten laden und scrollToBottom() aufrufen
       setTimeout(scrollToBottom, 100); // Kleine Verzögerung, damit das DOM aktualisiert wird
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
     setTimeout(scrollToBottom, 0); // Scrollt sofort nach dem Chat-Wechsel
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const handleProfileClick = (username: string) => {
    navigate(`/creator/${username}`);
  };

  const selectedChatData = chats.find((c) => c.id === selectedChat);

  return (
    // Stelle sicher, dass der äußere Container die volle Höhe hat
    // In AppShell ist main bereits flex-1 und overflow-y-auto,
    // also muss dieser Container hier flexibel sein.
    <div className="flex flex-col h-full"> {/* Nimmt die Höhe vom Parent (main in AppShell) */}
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 p-4 min-h-0"> {/* w-full hinzugefügt */}
        <h1 className="text-3xl font-serif text-foreground mb-8 hidden lg:block flex-shrink-0">Nachrichten</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0"> {/* min-h-0 ist wichtig für Flexbox-Scrolling */}
          {/* Chat List */}
          {/* Stelle sicher, dass die Chat-Liste auch scrollbar ist, falls sie zu lang wird */}
          <Card className={`bg-card border-border lg:col-span-1 overflow-hidden ${selectedChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'} h-full`}> {/* h-full + flex + flex-col */}
            <div className="overflow-y-auto flex-1 chat-messages-scrollbar"> {/* flex-1 + overflow-y-auto */}
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
                    <Avatar className="w-12 h-12 flex-shrink-0"> {/* flex-shrink-0 hinzugefügt */}
                      <AvatarImage src={chat.user.avatar} alt={chat.user.name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {chat.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0"> {/* min-w-0 für korrekten Textumbruch */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground truncate"> {/* truncate hinzugefügt */}
                          {chat.user.name}
                        </span>
                        {chat.unread > 0 && (
                          <span className="bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0"> {/* flex-shrink-0 hinzugefügt */}
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
             // Wichtig: h-full und overflow-hidden hier, damit innere Elemente scrollen können
            <div className={`bg-card border border-border rounded-lg lg:col-span-2 flex flex-col h-full overflow-hidden ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
              {/* Fixed Header */}
              <div className="p-4 border-b border-border flex items-center gap-3 flex-shrink-0">
                {/* ... (Header-Inhalt bleibt unverändert) ... */}
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

              {/* Scrollable Messages Area */}
              {/* flex-1 sorgt dafür, dass dieser Bereich den verfügbaren Platz einnimmt */}
              {/* overflow-y-auto macht nur diesen Bereich scrollbar */}
              {/* min-h-0 ist wichtig, damit Flexbox die Höhe korrekt berechnet */}
              <div className="flex-1 overflow-y-auto p-4 min-h-0 chat-messages-scrollbar">
                <div className="space-y-4 flex flex-col">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === 'creator' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] lg:max-w-[65%] px-4 py-2 rounded-lg ${ // max-w angepasst
                          msg.sender === 'creator'
                            ? 'bg-secondary text-secondary-foreground rounded-br-none' // Eigene Nachrichten
                            : 'bg-neutral text-foreground rounded-bl-none' // Nachrichten des anderen
                        }`}
                      >
                        <p className="break-words">{msg.text}</p> {/* break-words hinzugefügt */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'creator' && (
                            <CheckCheckIcon className="w-4 h-4" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                   {/* Leeres div am Ende als Anker für scrollToBottom */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Fixed Input */}
              {/* flex-shrink-0 verhindert, dass das Input-Feld schrumpft */}
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
                    size="icon" // Größe auf icon ändern für quadratischen Button
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal flex-shrink-0" // flex-shrink-0 hinzugefügt
                  >
                    <SendIcon className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder */}
          {!selectedChat && (
            <Card className="hidden lg:flex bg-card border-border lg:col-span-2 items-center justify-center h-full"> {/* h-full hinzugefügt */}
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