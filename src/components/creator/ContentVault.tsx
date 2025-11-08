// src/components/creator/ContentVault.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon, VideoIcon } from 'lucide-react';
import ProfilePostViewer, { PostData as ViewerPostData } from '../fan/ProfilePostViewer';
import { useAuthStore } from '../../stores/authStore';
import { postService, Post as ServicePostData } from '../../services/postService'; // Echten Service importieren
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast'; // Für Feedback

export default function ContentVault() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State für ALLE Posts aus der DB
  const [allPosts, setAllPosts] = useState<ServicePostData[]>([]);
  // State für die aktuell im Raster angezeigten (gefilterten) Posts
  const [filteredContent, setFilteredContent] = useState<ServicePostData[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('all');

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  // 1. Datenabruf: Alle Posts des Creators laden
  useEffect(() => {
    const fetchContent = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Neue Service-Methode verwenden, um ALLE Posts zu laden
        const posts = await postService.getCreatorVaultPosts(user.id);
        setAllPosts(posts || []);
      } catch (err: any) {
        setError('Fehler beim Laden der Inhalte.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [user?.id]); // Nur ausführen, wenn sich die User-ID ändert

  // 2. Filterung: Die `allPosts`-Liste basierend auf dem `currentTab` filtern
  useEffect(() => {
    const now = new Date();
    let contentToShow: ServicePostData[] = [];

    switch (currentTab) {
      case 'published':
        // Alle, die veröffentlicht sind UND keine Zukunftsplanung haben
        contentToShow = allPosts.filter(p =>
          p.is_published &&
          (!p.scheduled_for || new Date(p.scheduled_for) <= now)
        );
        break;
      case 'scheduled':
        // Alle, die ein Datum in der Zukunft haben (unabhängig von is_published)
        contentToShow = allPosts.filter(p =>
          p.scheduled_for && new Date(p.scheduled_for) > now
        );
        break;
      case 'drafts':
        // Alle, die NICHT veröffentlicht sind UND KEIN Zukunftsdatum haben
         contentToShow = allPosts.filter(p =>
          !p.is_published &&
          (!p.scheduled_for || new Date(p.scheduled_for) <= now)
        );
        break;
      case 'all':
      default:
        contentToShow = allPosts;
        break;
    }
    setFilteredContent(contentToShow);
    setSelectedItems([]); // Auswahl bei Tab-Wechsel zurücksetzen
  }, [currentTab, allPosts]);

  // 3. Auswahl umschalten
  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 4. Daten für den Post-Viewer formatieren (basierend auf gefilterter Liste)
  // --- KORREKTUR HIER ---
  // Stellt sicher, dass ALLE Post-Daten (inkl. creatorId, price, tier_id)
  // an den Viewer übergeben werden, indem ...post verwendet wird.
  const viewerPosts: ViewerPostData[] = useMemo(() =>
    filteredContent.map(post => ({
      ...post, // <-- WICHTIG: Übernimmt creatorId, price, tier_id etc.
      media: post.mediaUrl, // mediaUrl an 'media' mappen (von ViewerPostData verlangt)
      creator: { // 'creator'-Objekt überschreiben (von ViewerPostData verlangt)
        name: post.creator.name,
        username: post.creator.username || post.creator.id,
        avatar: post.creator.avatar,
        isVerified: post.creator.isVerified,
      },
  })), [filteredContent]); // Nur neu berechnen, wenn sich filteredContent ändert
  // --- ENDE KORREKTUR ---

  // 5. Post-Viewer öffnen
  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  // 6. Ausgewählte löschen
  const handleDeleteSelected = async () => {
    setLoading(true);
    try {
      // Alle Lösch-Anfragen parallel ausführen
      await Promise.all(
        selectedItems.map(id => postService.deletePost(id))
      );

      // State aktualisieren, um gelöschte Posts zu entfernen
      setAllPosts(prev => prev.filter(p => !selectedItems.includes(p.id)));
      setSelectedItems([]);
      toast({ title: "Erfolgreich gelöscht", description: `${selectedItems.length} Element(e) wurden entfernt.` });
    } catch (err) {
      setError("Fehler beim Löschen der ausgewählten Elemente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
        {/* HINWEIS: Wichtig für das Layout, `h-screen` oder `h-full` vom Parent anpassen */}
        <div className="flex flex-col h-full py-8 px-4">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-serif text-foreground">Content Vault</h1>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                onClick={() => navigate('/post/new')} // Navigiert zum Editor
              >
                <UploadIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Hochladen
              </Button>
            </div>

            {/* Auswahl-Aktionen-Leiste */}
            {selectedItems.length > 0 && (
              <Card className="bg-card border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">
                    {selectedItems.length} Element(e) ausgewählt
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="bg-background text-destructive border-border hover:bg-neutral font-normal"
                      onClick={handleDeleteSelected}
                      disabled={loading}
                    >
                      <Trash2Icon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Löschen
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Tabs-Navigation */}
          <div className="max-w-6xl mx-auto w-full my-8">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Alle
              </TabsTrigger>
              <TabsTrigger value="published" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Veröffentlicht
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Geplant
              </TabsTrigger>
              <TabsTrigger value="drafts" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Entwürfe
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Grid-Ansicht (scrollbar) */}
          <div className="flex-grow overflow-y-auto chat-messages-scrollbar pb-20 md:pb-0">
            <div className="max-w-6xl mx-auto">
              <TabsContent value={currentTab}>
                {loading && <p className="text-center text-muted-foreground">Inhalte werden geladen...</p>}
                {error && <p className="text-destructive text-center">{error}</p>}
                {!loading && !error && filteredContent.length === 0 && (
                  <p className="text-center text-muted-foreground">Keine Inhalte in dieser Kategorie gefunden.</p>
                )}
                {!loading && !error && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredContent.map((post, index) => (
                      <div
                        key={post.id}
                        className="relative group rounded-lg overflow-hidden cursor-pointer bg-neutral" // Fallback-BG
                        onClick={(e) => {
                           // Verhindert das Öffnen des Viewers, wenn auf die Checkbox geklickt wird
                           if (e.target instanceof HTMLElement && e.target.closest('[role="checkbox"]')) {
                             return;
                           }
                           handlePostClick(index); // Index aus der gefilterten Liste
                        }}
                      >

                        {/* --- HIER IST DER FIX (Nr. 1 & 2) --- */}
                        {post.mediaType === 'video' ? (
                          <video
                            src={post.mediaUrl}
                            muted
                            loop
                            playsInline
                            autoPlay
                            className="w-full aspect-square object-cover"
                          />
                        ) : (
                          <img
                            src={post.thumbnail_url || post.mediaUrl}
                            alt="" // <-- "Alt-Text"-Problem behoben (auf leer gesetzt)
                            className="w-full aspect-square object-cover"
                            loading="lazy"
                          />
                        )}
                        {/* --- ENDE DES FIXES --- */}


                        {/* Video-Icon anzeigen (optional, falls Video-Vorschau nicht lädt) */}
                        {post.mediaType === 'video' && (
                          <VideoIcon className="absolute top-2 right-2 w-5 h-5 text-white drop-shadow-lg" strokeWidth={2} />
                        )}

                        {/* Checkbox-Overlay */}
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedItems.includes(post.id)}
                            onCheckedChange={() => toggleSelection(post.id)}
                            className="w-6 h-6 bg-black/50 border-white/50 text-secondary data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                            onClick={(e) => e.stopPropagation()} // Klick-Event stoppen
                          />
                        </div>

                        {/* Datums- und Status-Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-xs text-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                          {!post.is_published && post.scheduled_for && new Date(post.scheduled_for) > new Date() && (
                            <span className="ml-2 text-xs text-yellow-400 font-medium">Geplant</span>
                          )}
                          {!post.is_published && (!post.scheduled_for || new Date(post.scheduled_for) <= new Date()) && (
                            <span className="ml-2 text-xs text-gray-400 font-medium">Entwurf</span>
                          )}
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

      {/* Post-Viewer Modal */}
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