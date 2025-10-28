import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon } from 'lucide-react';
import ProfilePostViewer, { PostData } from '../fan/ProfilePostViewer';
import { useAuthStore } from '../../stores/authStore';

// HINWEIS: Service und Typen müssen noch implementiert werden
// import { contentVaultService } from '../../services/contentVaultService';

// Annahme für die Datenstruktur
interface MediaItem {
  id: string;
  thumbnail: string;
  status: 'uploaded' | 'scheduled' | 'archived';
  date: string; // oder Date-Objekt
}

export default function ContentVault() {
  const { user } = useAuthStore();
  const [content, setContent] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('all');

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);
      try {
        // HINWEIS: Die folgende Zeile ist auskommentiert, da der Service noch nicht existiert.
        // Ersetzen Sie dies durch den echten Service-Aufruf, sobald er verfügbar ist.
        // const status = currentTab === 'all' ? undefined : currentTab;
        // const mediaItems = await contentVaultService.getMediaItems(user.id, { status });
        // setContent(mediaItems || []);

        // Mock-Daten als Platzhalter
        const mockContent: MediaItem[] = [
          { id: '1', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-15' },
          { id: '2', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-20' },
          { id: '3', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-14' },
          { id: '4', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'archived', date: '2024-01-10' },
          { id: '5', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-13' },
          { id: '16', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-22' },
        ];
        
        // Filtere die Mock-Daten basierend auf dem Tab
        const status = currentTab === 'all' ? undefined : currentTab;
        const filteredMock = status ? mockContent.filter(item => item.status === status) : mockContent;
        setContent(filteredMock);

      } catch (err) {
        setError('Fehler beim Laden der Inhalte.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [user?.id, currentTab]);

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Erzeuge die PostData für den Viewer basierend auf dem aktuell gefilterten Inhalt
  const viewerPosts: PostData[] = content.map(item => ({
    id: item.id,
    media: item.thumbnail, // Annahme: thumbnail ist das Vollbild
    caption: `Post vom ${new Date(item.date).toLocaleDateString()}`,
    hashtags: ['content', 'vault'],
    likes: 0, // Diese Daten müssten vom Backend kommen
    comments: 0, // Diese Daten müssten vom Backend kommen
    isLiked: false,
    creator: {
      name: user?.name || 'Du',
      username: user?.username || 'creator',
      avatar: user?.avatar || 'https://placehold.co/100x100', // Platzhalter-Avatar
      isVerified: true,
    },
  }));

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  return (
    <>
      <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
        <div className="flex flex-col h-screen py-8 px-4">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-serif text-foreground">Content Vault</h1>
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                <UploadIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Hochladen
              </Button>
            </div>

            {selectedItems.length > 0 && (
              <Card className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">
                    {selectedItems.length} Element(e) ausgewählt
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                    >
                      Verwenden
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-background text-destructive border-border hover:bg-neutral font-normal"
                    >
                      <Trash2Icon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Löschen
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
          <div className="max-w-6xl mx-auto w-full my-8">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Alle
              </TabsTrigger>
              <TabsTrigger value="uploaded" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Hochgeladen
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Geplant
              </TabsTrigger>
              <TabsTrigger value="archived" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Archiviert
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-grow overflow-y-auto chat-messages-scrollbar">
            <div className="max-w-6xl mx-auto">
              <TabsContent value={currentTab}>
                {loading && <p>Inhalte werden geladen...</p>}
                {error && <p className="text-destructive">{error}</p>}
                {!loading && !error && content.length === 0 && <p>Keine Inhalte in dieser Kategorie gefunden.</p>}
                {!loading && !error && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {content.map((item, index) => (
                      <div
                        key={item.id}
                        className="relative group rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => handlePostClick(index)} // Index übergeben
                      >
                        <img
                          src={item.thumbnail}
                          alt="Content"
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(e) => {
                              if (e) e.stopPropagation(); // Verhindert das Öffnen des Viewers
                              toggleSelection(item.id);
                            }}
                            className="w-6 h-6"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-xs text-foreground">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
      {isViewerOpen && (
        <ProfilePostViewer
          initialPosts={viewerPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
}
