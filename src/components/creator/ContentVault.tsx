import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon } from 'lucide-react';
import ProfilePostViewer, { PostData, CreatorInfo } from '../fan/ProfilePostViewer';

export default function ContentVault() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  const content = [
    { id: '1', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-15' },
    { id: '2', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-20' },
    { id: '3', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-14' },
    { id: '4', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'archived', date: '2024-01-10' },
    { id: '5', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-13' },
    { id: '6', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-15' },
    { id: '7', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-20' },
    { id: '8', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-14' },
    { id: '9', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'archived', date: '2024-01-10' },
    { id: '10', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-13' },
    { id: '11', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-15' },
    { id: '12', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-20' },
    { id: '13', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-14' },
    { id: '14', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'archived', date: '2024-01-10' },
    { id: '15', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-13' },
    { id: '16', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-22' },
  ];

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const viewerPosts: PostData[] = content.map(item => ({
    id: item.id,
    media: item.thumbnail, // Assuming thumbnail is the full-size image
    caption: `Post from ${item.date}`,
    hashtags: ['content', 'vault'],
    likes: 0,
    comments: 0,
    isLiked: false,
    creator: {
      name: 'You',
      username: 'creator',
      avatar: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', // Placeholder avatar
      isVerified: true,
    },
  }));

  const handlePostClick = (index: number) => {
    setSelectedPostIndex(index);
    setIsViewerOpen(true);
  };

  const filterContent = (status?: string) => {
    if (!status) return content;
    return content.filter((item) => item.status === status);
  };

  return (
    <>
      <Tabs defaultValue="all" className="w-full">
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
                {['all', 'uploaded', 'scheduled', 'archived'].map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filterContent(tab === 'all' ? undefined : tab).map((item) => (
                        <div
                          key={item.id}
                          className="relative group rounded-lg overflow-hidden cursor-pointer"
                          onClick={() => handlePostClick(content.findIndex(c => c.id === item.id))}
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
                                e.stopPropagation(); // Prevent opening the viewer
                                toggleSelection(item.id);
                              }}
                              className="w-6 h-6"
                            />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <span className="text-xs text-foreground">{item.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
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
