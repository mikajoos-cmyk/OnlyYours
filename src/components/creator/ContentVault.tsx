// src/components/creator/ContentVault.tsx
import { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon, VideoIcon, PencilIcon } from 'lucide-react';
import ProfilePostViewer, { PostData as ViewerPostData } from '../fan/ProfilePostViewer';
import { useAuthStore } from '../../stores/authStore';
import { postService, Post as ServicePostData } from '../../services/postService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { SecureMedia } from '../ui/SecureMedia';
import ProductManager from './ProductManager';

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
  const [vaultMode, setVaultMode] = useState<'posts' | 'products'>('posts');


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
        id: post.creator.id,
        name: post.creator.name,
        username: post.creator.username || post.creator.id,
        avatar: post.creator.avatar,
        isVerified: post.creator.isVerified ?? false,
        bio: post.creator.bio,
        followers: post.creator.followers,
        subscriptionPrice: post.creator.subscriptionPrice,
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
    <div className="flex flex-col h-full py-8 px-4">
      <div className="max-w-6xl mx-auto w-full space-y-8 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-serif text-foreground">Content Vault</h1>
          <div className="flex bg-card border border-border rounded-lg p-1">
            <Button
              variant={vaultMode === 'posts' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setVaultMode('posts')}
              className="rounded-md"
            >
              Beiträge
            </Button>
            <Button
              variant={vaultMode === 'products' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setVaultMode('products')}
              className="rounded-md"
            >
              Shop-Produkte
            </Button>
          </div>
        </div>

        {vaultMode === 'posts' && (
          <div className="flex flex-col space-y-8">
            <Button
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal w-fit"
              onClick={() => navigate('/post/new')}
            >
              <UploadIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Hochladen
            </Button>

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

            <Tabs defaultValue="all" onValueChange={setCurrentTab} className="w-full">
              <TabsList className="bg-card border border-border w-full md:w-auto mb-8">
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

              <TabsContent value={currentTab} className="mt-0">
                {loading && <p className="text-center text-muted-foreground py-10">Inhalte werden geladen...</p>}
                {error && <p className="text-destructive text-center py-10">{error}</p>}
                {!loading && !error && filteredContent.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Keine Inhalte in dieser Kategorie gefunden.</p>
                )}
                {!loading && !error && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
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
                        <SecureMedia
                          path={post.thumbnail_url || post.mediaUrl}
                          type={post.mediaType}
                          alt=""
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                        />

                        {post.mediaType === 'video' && (
                          <VideoIcon className="absolute top-2 left-10 w-5 h-5 text-white drop-shadow-lg" strokeWidth={2} />
                        )}

                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedItems.includes(post.id)}
                            onCheckedChange={() => toggleSelection(post.id)}
                            className="w-6 h-6 bg-black/50 border-white/50 text-secondary data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border-none text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/post/new?edit=${post.id}`);
                            }}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
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
            </Tabs>
          </div>
        )}

        {vaultMode === 'products' && (
          <div className="pb-20">
            <ProductManager showOnly="list" />
          </div>
        )}
      </div>

      {isViewerOpen && (
        <ProfilePostViewer
          initialPosts={viewerPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
}
