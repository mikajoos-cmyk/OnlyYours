import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { SearchIcon, SlidersHorizontalIcon, CheckIcon } from 'lucide-react';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { userService, UserProfile } from '../../services/userService'; // Import user service und UserProfile
import { useAuthStore } from '../../stores/authStore'; // Import AuthStore
import { subscriptionService } from '../../services/subscriptionService'; // Import SubscriptionService
import { useToast } from '../../hooks/use-toast'; // Import useToast
import SubscriptionModal from './SubscriptionModal'; // Import SubscriptionModal
import { cn } from '../../lib/utils'; // Import cn

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [contentType, setContentType] = useState('all');
  const [creators, setCreators] = useState<UserProfile[]>([]); // Korrekter Typ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // States für Abonnement-Status
  const { user: currentUser } = useAuthStore();
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<UserProfile | null>(null);

  const popularTags = ['#luxury', '#fitness', '#behindthescenes', '4K', 'Live jetzt'];

  // Effekt zum Laden der Abonnements des aktuellen Benutzers
  useEffect(() => {
    if (!currentUser?.id) {
      setIsLoadingSubscriptions(false);
      return;
    }

    const fetchSubscriptions = async () => {
      setIsLoadingSubscriptions(true);
      try {
        const subs = await subscriptionService.getUserSubscriptions();
        // Erstellen eines Sets mit allen Creator-IDs, die der User abonniert hat
        const subIds = new Set(subs.map(s => s.creatorId));
        setSubscribedCreatorIds(subIds);
      } catch (err) {
        console.error("Fehler beim Laden der Abonnements:", err);
        toast({ title: "Fehler", description: "Abonnements konnten nicht geladen werden.", variant: "destructive" });
      } finally {
        setIsLoadingSubscriptions(false);
      }
    };

    fetchSubscriptions();
  }, [currentUser?.id, toast]); // toast zur Abhängigkeitsliste hinzugefügt

  // Effekt zum Suchen/Laden von Creators
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

  // Handler für Abo-Modal
  const handleSubscribeClick = (creator: UserProfile) => {
    if (!currentUser) {
      toast({ title: "Bitte anmelden", description: "Du musst angemeldet sein, um zu abonnieren.", variant: "destructive" });
      return;
    }
    setSelectedCreator(creator);
    setShowSubscriptionModal(true);
  };

  // Handler zur Verwaltung von Abos (leitet zum Profil)
  const handleManageSubscriptionClick = () => {
    navigate('/profile');
    toast({ title: "Abonnement", description: "Verwalte deine Abonnements in deinem Profil." });
  };

  return (
    <>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-3xl font-serif text-foreground">Creators suchen</h1>

          {/* --- Suchleiste und Filter (unverändert) --- */}
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
          {/* --- Ende Suchleiste und Filter --- */}


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

            {/* --- Aktualisierte Creator-Liste --- */}
            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creators.map((creator) => {

                  // Prüfen, ob der Creator abonniert ist
                  const isSubscribed = subscribedCreatorIds.has(creator.id);
                  // Prüfen, ob es das eigene Profil ist
                  const isOwnProfile = currentUser?.id === creator.id;

                  return (
                    <Card
                      key={creator.id}
                      className="bg-card border-border overflow-hidden"
                    >
                      {/* --- Bannerbild (Vorschaubild) --- */}
                      <div
                        className="relative h-48 bg-neutral cursor-pointer" // Fallback-Hintergrund
                        onClick={() => navigate(`/profile/${creator.username}`)}
                      >
                        {creator.bannerUrl ? (
                          <img
                            src={creator.bannerUrl}
                            alt={creator.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          // Fallback, wenn kein Bannerbild vorhanden ist
                          <div className="w-full h-full object-cover bg-neutral" />
                        )}
                      </div>

                      {/* --- Profilbild, Name und Button --- */}
                      <div className="p-4 flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => navigate(`/profile/${creator.username}`)}
                        >
                          <Avatar className="w-12 h-12 border-2 border-secondary">
                            <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {creator.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-foreground">{creator.displayName}</h3>
                          </div>
                        </div>

                        {/* --- Aktualisierter Abo-Button --- */}
                        {!isOwnProfile && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation(); // Verhindert Klick auf Karte
                              isSubscribed ? handleManageSubscriptionClick() : handleSubscribeClick(creator);
                            }}
                            disabled={isLoadingSubscriptions}
                            className={cn(
                              "font-normal transition-colors duration-200 flex-shrink-0", // Wichtig bei langen Namen
                              isSubscribed
                                ? "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 px-3"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            )}
                          >
                            {isLoadingSubscriptions ? '...' : (
                              isSubscribed ? (
                                <>
                                  <CheckIcon className="w-4 h-4 mr-1" strokeWidth={2} />
                                  Abonniert
                                </>
                              ) : (
                                'Abonnieren'
                              )
                            )}
                          </Button>
                        )}
                        {/* --- Ende Button --- */}

                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Abonnement-Modal --- */}
      {showSubscriptionModal && selectedCreator && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          creator={{
            name: selectedCreator.displayName,
            subscriptionPrice: selectedCreator.subscriptionPrice,
          }}
        />
      )}
    </>
  );
}