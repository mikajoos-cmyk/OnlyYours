import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { UploadIcon, Trash2Icon } from 'lucide-react';

export default function ContentVault() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const content = [
    { id: '1', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-15' },
    { id: '2', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-20' },
    { id: '3', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-14' },
    { id: '4', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'archived', date: '2024-01-10' },
    { id: '5', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'uploaded', date: '2024-01-13' },
    { id: '6', thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png', status: 'scheduled', date: '2024-01-22' },
  ];

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filterContent = (status?: string) => {
    if (!status) return content;
    return content.filter((item) => item.status === status);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
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

        <Tabs defaultValue="all" className="w-full">
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

          {['all', 'uploaded', 'scheduled', 'archived'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filterContent(tab === 'all' ? undefined : tab).map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-lg overflow-hidden cursor-pointer"
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
                        onCheckedChange={() => toggleSelection(item.id)}
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
        </Tabs>
      </div>
    </div>
  );
}
