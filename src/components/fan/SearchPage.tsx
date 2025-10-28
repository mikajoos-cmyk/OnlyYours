import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SearchIcon, SlidersHorizontalIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { userService } from '../../services/userService'; // Import user service

// Annahme für die Creator-Datenstruktur
interface Creator {
  id: string;
  name: string;
  avatar: string;
  banner: string;
  badges: string[];
  isLive: boolean;
  username: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [contentType, setContentType] = useState('all');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const popularTags = ['#luxury', '#fitness', '#behindthescenes', '4K', 'Live jetzt'];

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        setError(null);

        // Wenn keine Suchanfrage besteht, Top-Creators laden
        if (!searchQuery && priceFilter === 'all' && contentType === 'all') {
          const topCreators = await userService.getTopCreators();
          setCreators(topCreators || []);
        } else {
          // Ansonsten Suche mit den aktuellen Filtern
          const filters = { price: priceFilter, type: contentType };
          const searchResults = await userService.searchCreators(searchQuery, filters);
          setCreators(searchResults || []);
        }

      } catch (err) {
        setError('Fehler bei der Suche nach Creators.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce: Warte kurz, bevor die Suche nach einer Eingabe ausgelöst wird
    const handler = setTimeout(() => {
      fetchCreators();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, priceFilter, contentType]);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif text-foreground">Creators suchen</h1>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Suche nach Creators, Kategorien oder Hashtags"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card text-foreground border-border h-12"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="bg-card text-foreground border-border hover:bg-neutral h-12 px-6 font-normal"
              >
                <SlidersHorizontalIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-card text-foreground border-border">
              <SheetHeader>
                <SheetTitle className="text-foreground">Filter</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Preis</Label>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border">
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="free">Kostenlos</SelectItem>
                      <SelectItem value="low">Unter 10€</SelectItem>
                      <SelectItem value="medium">10€ - 30€</SelectItem>
                      <SelectItem value="high">Über 30€</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Art</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card text-foreground border-border">
                      <SelectItem value="all">Video, Foto</SelectItem>
                      <SelectItem value="video">Nur Video</SelectItem>
                      <SelectItem value="photo">Nur Foto</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Button
              key={tag}
              variant="outline"
              onClick={() => setSearchQuery(tag)} // Setzt den Tag als Suchanfrage
              className="bg-card text-foreground border-border hover:bg-secondary hover:text-secondary-foreground rounded-full font-normal"
            >
              {tag}
            </Button>
          ))}
        </div>

        <div>
          <h2 className="text-xl font-serif text-foreground mb-4">Ergebnisse</h2>
          {loading && <p>Suche läuft...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && creators.length === 0 && <p>Keine Creators gefunden.</p>}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {creators.map((creator) => (
                <Card
                  key={creator.id}
                  className="bg-card border-border overflow-hidden cursor-pointer hover:border-secondary transition-colors"
                  onClick={() => navigate(`/profile/${creator.username}`)}
                >
                  <div className="relative h-48">
                    <img
                      src={creator.banner}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                    {creator.isLive && (
                      <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground font-normal">
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-secondary">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {creator.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-foreground">{creator.name}</h3>
                        <div className="flex gap-2 mt-1">
                          {creator.badges.map((badge) => (
                            <span
                              key={badge}
                              className="text-xs text-muted-foreground"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                      Abonnieren
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
