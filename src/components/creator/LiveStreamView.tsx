// src/components/creator/LiveStreamView.tsx
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import TipModal from '../fan/TipModal';
import { DollarSignIcon, Loader2Icon, SendIcon, XIcon, InfoIcon, UsersIcon, CrownIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import type { UserProfile } from '../../services/userService';
import MuxPlayer from "@mux/mux-video-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Interface passt zur DB-Tabelle
interface LiveMessage {
  id: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  content: string;
  message_type: 'CHAT' | 'TIP';
  tip_amount: number | null;
}

interface Tipper {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  total_tipped: number;
}

interface LiveStreamViewProps {
  isStreamer: boolean;
  creator: UserProfile; // Das Profil des Streamers
}

export default function LiveStreamView({ isStreamer, creator }: LiveStreamViewProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(true);
  const chatEndRef = useRef<null | HTMLDivElement>(null);

  const [viewerCount, setViewerCount] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showStreamInfoModal, setShowStreamInfoModal] = useState(false);

  const [leaderboard, setLeaderboard] = useState<Tipper[]>([]);
  const [activeTab, setActiveTab] = useState('chat');

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const MUX_PLAYBACK_ID = creator.mux_playback_id;
  const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";
  const MUX_STREAM_KEY = creator.mux_stream_key;

  // 1. Video-Streaming-Logik
  useEffect(() => {
    // Info-Modal wird jetzt nur bei Klick auf Info-Icon geöffnet
  }, [isStreamer]);

  // 2. Scroll-Logik
  useEffect(() => {
    setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  // 3. Leaderboard-Ladefunktion
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('get_stream_leaderboard', {
        creator_id_input: creator.id
      });
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error("Fehler beim Laden des Leaderboards:", error);
    }
  };


  // 4. Live-Chat & Presence (Zuschauerzahl) Logik
  useEffect(() => {
    // Lade Chat-Verlauf
    const fetchChatHistory = async () => {
      setIsChatLoading(true);
      try {
        const { data, error } = await supabase
          .from('live_chat_messages')
          .select('*')
          .eq('creator_id', creator.id)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        const history: LiveMessage[] = data.map(msg => ({
          id: msg.id,
          user_id: msg.user_id,
          user_name: msg.user_name,
          user_avatar: msg.user_avatar,
          content: msg.content,
          message_type: (msg.message_type as 'CHAT' | 'TIP') || 'CHAT',
          tip_amount: msg.tip_amount,
        }));
        setMessages(history);

      } catch (error) {
        console.error("Fehler beim Laden des Chat-Verlaufs:", error);
      } finally {
        setIsChatLoading(false);
      }
    };

    fetchChatHistory();
    fetchLeaderboard();

    const leaderboardInterval = setInterval(fetchLeaderboard, 30000);

    // Kanal-Setup
    const channel = supabase.channel(`live:stream:${creator.id}`);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    channelRef.current = channel;

    channel
      // Hört auf NEUE Datenbank-Einträge (Chats UND Tips)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `creator_id=eq.${creator.id}`
      }, (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            user_id: newMsg.user_id,
            user_name: newMsg.user_name,
            user_avatar: newMsg.user_avatar,
            content: newMsg.content,
            message_type: newMsg.message_type as 'CHAT' | 'TIP',
            tip_amount: newMsg.tip_amount,
          }]);

          if (newMsg.message_type === 'TIP') {
            fetchLeaderboard();
          }
      })
      .on('broadcast', { event: 'stream_end' }, () => {
        if (!isStreamer) {
          toast({ title: "Stream beendet", description: "Der Creator hat den Stream beendet.", duration: 5000});
          navigate(`/profile/${creator.username}`);
        }
      })
      // Hört auf Zuschauer-Änderungen (Zuschauerzahl)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user?.id || `guest_${Math.random()}` });
        }
      });

    return () => {
      clearInterval(leaderboardInterval);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [creator.id, creator.username, isStreamer, navigate, toast, user?.id]);

  // Chat-Nachricht senden (schreibt in DB via RLS)
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !channelRef.current) return;

    try {
      const { error } = await supabase
        .from('live_chat_messages')
        .insert({
          creator_id: creator.id,
          user_id: user.id,
          user_name: user.name,
          user_avatar: user.avatar,
          content: newMessage.trim(),
          message_type: 'CHAT',
          tip_amount: 0,
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      toast({ title: "Fehler", description: "Chat-Nachricht konnte nicht gesendet werden: " + error.message, variant: "destructive" });
    }
  };

  // --- KORREKTUR: Trinkgeld-Handler ruft jetzt RPC auf ---
  const handleTipClick = () => {
    if (isStreamer) return;
    setShowTipModal(true);
  };

  const handleTipSuccess = async (amount: number) => {
    const creatorName = creator.displayName;
    const tipAmountString = amount.toFixed(2);

    toast({ title: "Danke!", description: `Trinkgeld an ${creatorName} gesendet.` });

    if (!user || !channelRef.current) return;

    try {
      // 1. Rufe die sichere RPC-Funktion auf
      const { error: rpcError } = await supabase.rpc('send_tip_message', {
        creator_id_input: creator.id,
        user_id_input: user.id,
        user_name_input: `${user.name} hat ${creatorName} ein Trinkgeld gegeben!`,
        user_avatar_input: '🎉',
        content_input: `${tipAmountString}€!`,
        tip_amount_input: amount,
      });

      if (rpcError) throw rpcError;

      // 2. Wir müssen nichts weiter tun.
      // Die 'postgres_changes'-Subscription (oben) wird diese
      // neue DB-Zeile automatisch erkennen und den Chat
      // und das Leaderboard für alle aktualisieren.

    } catch (error: any) {
      console.error("Fehler beim Senden der Tip-Nachricht (RPC):", error);
      toast({ title: "Fehler", description: "Trinkgeld-Anzeige im Chat fehlgeschlagen.", variant: "destructive" });
    }
  };
  // --- ENDE KORREKTUR ---

  // Stream beenden
  const handleStopStream = async () => {
    if (channelRef.current) {
       await channelRef.current.send({ type: 'broadcast', event: 'stream_end' });
    }
    navigate('/dashboard');
  };


  return (
    <>
      <div className="fixed inset-0 bg-black text-foreground flex flex-col md:flex-row h-screen w-screen">

        {/* --- A: VIDEO-BEREICH (Fix für ll-live) --- */}
        <div className="relative flex-1 bg-neutral">

          {MUX_PLAYBACK_ID ? (
            <MuxPlayer
              playbackId={MUX_PLAYBACK_ID}
              streamType="live"
              latency="low" // KORREKTE PROP FÜR LOW-LATENCY
              autoPlay
              muted={isStreamer}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">
                {isStreamer ? "Stream-Keys nicht gefunden." : "Stream ist (noch) nicht verfügbar."}
              </p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

          {/* Header (mit Zuschauerzahl) */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-secondary">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
                <AvatarFallback>{creator.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground drop-shadow-lg">{creator.displayName}</p>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-secondary drop-shadow-lg font-bold">LIVE</p>
                  <div className="flex items-center gap-1.5 text-sm text-white/80">
                    <UsersIcon className="w-4 h-4" />
                    {viewerCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isStreamer && (
                <Button
                  onClick={() => setShowStreamInfoModal(true)}
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-black/50 hover:bg-black/80"
                >
                  <InfoIcon className="w-5 h-5" />
                </Button>
              )}
              <Button
                onClick={isStreamer ? handleStopStream : () => navigate(-1)}
                variant={isStreamer ? "destructive" : "ghost"}
                size="icon"
                className="rounded-full bg-black/50 hover:bg-black/80"
              >
                <XIcon className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {!isStreamer && (
            <div className="absolute right-4 bottom-24 z-10 md:bottom-8">
              <button
                onClick={handleTipClick}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center">
                  <DollarSignIcon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                </div>
              </button>
            </div>
          )}

        </div>

        {/* --- B: CHAT-BEREICH (mit Tabs und Verlauf) --- */}
        <div className="flex flex-col w-full md:w-80 lg:w-96 bg-card border-l border-border h-1/2 md:h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="bg-card border-b border-border rounded-none justify-start px-4">
              <TabsTrigger value="chat" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary data-[state=active]:text-secondary rounded-none text-muted-foreground">
                Chat
              </TabsTrigger>
              <TabsTrigger value="top" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary data-[state=active]:text-secondary rounded-none text-muted-foreground">
                Top Tipper
              </TabsTrigger>
            </TabsList>

            {/* Chat-Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1 p-4">
                {isChatLoading && <Loader2Icon className="w-6 h-6 mx-auto my-8 animate-spin text-muted-foreground" />}

                <div className="space-y-4">
                  {messages.map((msg) => (
                    (msg.message_type === 'TIP') ? (
                      // Trinkgeld-Nachricht
                      <div key={msg.id} className="text-center my-2">
                        <span className="text-secondary font-semibold p-2 bg-secondary/10 rounded-lg text-sm">
                          🎉 {msg.user_name} {msg.content}
                        </span>
                      </div>
                    ) : (
                      // Normale Chat-Nachricht
                      <div key={msg.id} className="flex items-start gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={msg.user_avatar || undefined} />
                          <AvatarFallback>{msg.user_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">{msg.user_name}</span>
                          <p className="text-sm text-foreground break-words">{msg.content}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                <div ref={chatEndRef} />
              </ScrollArea>
            </TabsContent>

            {/* Top Tipper Tab */}
            <TabsContent value="top" className="flex-1 flex flex-col min-h-0 m-0">
              <ScrollArea className="flex-1 p-4">
                {leaderboard.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Noch keine Trinkgelder in diesem Stream.</p>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((tipper, index) => (
                      <div key={tipper.user_id} className="flex items-center gap-3">
                        <span className={cn(
                          "font-bold text-lg w-6 text-center",
                          index === 0 && "text-secondary",
                          index === 1 && "text-muted-foreground",
                          index === 2 && "text-muted-foreground/70"
                        )}>
                          {index + 1}
                        </span>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={tipper.user_avatar || undefined} />
                          <AvatarFallback>{tipper.user_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-foreground flex-1 truncate">{tipper.user_name}</span>
                        <span className="text-secondary font-semibold">
                          {/* (toFixed(2) ist bei 'numeric' aus RPC wichtig) */}
                          {Number(tipper.total_tipped).toFixed(2)}€
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Chat-Eingabe */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Chatten..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-background text-foreground border-border"
                disabled={!user}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                disabled={!newMessage.trim() || !user}
              >
                <SendIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Trinkgeld-Modal */}
      {!isStreamer && (
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creator={{ id: creator.id, name: creator.displayName }} // displayName ist korrekt
          onTipSuccess={handleTipSuccess} // Übergibt jetzt den Betrag
        />
      )}

      {/* Info-Modal für Streamer */}
      <AlertDialog open={showStreamInfoModal} onOpenChange={setShowStreamInfoModal}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Stream-Schlüssel</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Verwende diese Daten in deiner Streaming-Software (z.B. Larix, OBS), um
              live zu gehen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="text-muted-foreground">RTMP-URL</Label>
              <Input value={MUX_RTMP_URL} readOnly className="bg-background border-border" />
            </div>
            <div>
              <Label className="text-muted-foreground">Stream Key (Geheim)</Label>
              <Input value={MUX_STREAM_KEY || "Lade... (bitte neu laden, falls leer)"} readOnly className="bg-background border-border" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => setShowStreamInfoModal(false)}
            >
              Verstanden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}