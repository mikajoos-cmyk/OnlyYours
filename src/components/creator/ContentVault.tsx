// src/components/creator/ContentVault.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon, VideoIcon } from 'lucide-react';
import ProfilePostViewer, { PostData as ViewerPostData } from '../fan/ProfilePostViewer';
import { useAuthStore } from '../../stores/authStore';
import { postService, Post as ServicePostData } from '../../services/postService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

export default function ContentVault() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allPosts, setAllPosts] = useState<ServicePostData[]>([]);
  const [filteredContent, setFilteredContent] = useState<ServicePostData[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('all');

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  useEffect(() => {
    const fetchContent = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
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
  }, [user?.id]);

  useEffect(() => {
    const now = new Date();
    let contentToShow: ServicePostData[] = [];

    switch (currentTab) {
      case 'published':
        contentToShow = allPosts.filter(p =>
          p.is_published &&
          (!p.scheduled_for || new Date(p.scheduled_for) <= now)
        );
        break;
      case 'scheduled':
        contentToShow = allPosts.filter(p =>
          p.scheduled_for && new Date(p.scheduled_for) > now
        );
        break;
      case 'drafts':
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
    setSelectedItems([]);
  }, [currentTab, allPosts]);

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const viewerPosts: ViewerPostData[] = useMemo(() =>
    filteredContent.map(post => ({
      ...post,
      media: post.mediaUrl,
      creator: {
        name: post.creator.name,
        username: post.creator.username || post.creator.id,
        avatar: post.creator.avatar,
        isVerified: post.creator.isVerified,
      },
  })), [filteredContent]);

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  const handleDeleteSelected = async () => {
    setLoading(true);
    try {
      await Promise.all(
        selectedItems.map(id => postService.deletePost(id))
      );
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
      {/* FIX: h-full hier ist wichtig, damit die Tabs den Container füllen */}
      <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full h-full flex flex-col">

        <div className="flex flex-col h-full py-8 px-4">
          <div className="max-w-6xl mx-auto w-full space-y-8 flex-shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-serif text-foreground">Content Vault</h1>
              <Button
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                onClick={() => navigate('/post/new')}
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

            {/* Tabs-Navigation */}
            <div className="my-8">
              <TabsList className="bg-card border border-border w-full md:w-auto">
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
          </div>

          {/* Grid-Ansicht (Scrollbar Bereich) */}
          <div
             className={cn(
               "flex-grow overflow-y-auto chat-messages-scrollbar",
               // FIX: Dynamisches Padding für Mobile (Nav + Safe Area), 0 für Desktop
               "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
             )}
          >
            {/* FIX: 'h-full' entfernt, damit der Inhalt wachsen kann. 'min-h-full' für Zentrierung bei wenig Inhalt. */}
            <div className="max-w-6xl mx-auto min-h-full">
              {/* FIX: 'h-full' entfernt. 'mt-0' beibehalten. */}
              <TabsContent value={currentTab} className="mt-0">
                {loading && <p className="text-center text-muted-foreground py-10">Inhalte werden geladen...</p>}
                {error && <p className="text-destructive text-center py-10">{error}</p>}
                {!loading && !error && filteredContent.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Keine Inhalte in dieser Kategorie gefunden.</p>
                )}
                {!loading && !error && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                    {filteredContent.map((post, index) => (
                      <div
                        key={post.id}
                        className="relative group rounded-lg overflow-hidden cursor-pointer bg-neutral aspect-square"
                        onClick={(e) => {
                           if (e.target instanceof HTMLElement && e.target.closest('[role="checkbox"]')) {
                             return;
                           }
                           handlePostClick(index);
                        }}
                      >
                        {post.mediaType === 'video' ? (
                          <video
                            src={post.mediaUrl}
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={post.thumbnail_url || post.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}

                        {post.mediaType === 'video' && (
                          <VideoIcon className="absolute top-2 right-2 w-5 h-5 text-white drop-shadow-lg" strokeWidth={2} />
                        )}

                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedItems.includes(post.id)}
                            onCheckedChange={() => toggleSelection(post.id)}
                            className="w-6 h-6 bg-black/50 border-white/50 text-secondary data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <span className="text-xs text-white/90 block">{new Date(post.created_at).toLocaleDateString()}</span>
                          {!post.is_published && post.scheduled_for && new Date(post.scheduled_for) > new Date() && (
                            <span className="text-xs text-yellow-400 font-medium block">Geplant</span>
                          )}
                          {!post.is_published && (!post.scheduled_for || new Date(post.scheduled_for) <= new Date()) && (
                            <span className="text-xs text-gray-400 font-medium block">Entwurf</span>
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