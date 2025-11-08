// src/components/profile/CreatorProfile.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../stores/authStore';
import { CameraIcon, ImageIcon, DollarSignIcon, MessageSquareIcon, Loader2Icon, PlusIcon, Trash2Icon, EditIcon } from 'lucide-react';
import { storageService } from '../../services/storageService';
import { useToast } from '../../hooks/use-toast';
// --- NEUE IMPORTS ---
import { tierService, Tier } from '../../services/tierService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '../ui/dialog';
// --- ENDE NEUE IMPORTS ---

export default function CreatorProfile() {
  const { user, updateProfile } = useAuthStore();
  const { toast } = useToast();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Ladezustände
  const [isBrandingLoading, setIsBrandingLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  // const [isMonetizationLoading, setIsMonetizationLoading] = useState(false); // Entfernt
  const [isCommunicationLoading, setIsCommunicationLoading] = useState(false);

  // States für Formular "Branding"
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  // States für Formular "Informationen"
  const [bio, setBio] = useState(user?.bio || '');

  // States für Formular "Monetarisierung"
  // --- ENTFERNT: Basis-Abo-Preis ---
  // const [subscriptionPrice, setSubscriptionPrice] = useState(
  //   user?.subscriptionPrice ? user.subscriptionPrice.toFixed(2) : '0.00'
  // );
  // --- ENDE ---

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isTierLoading, setIsTierLoading] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null); // Für Bearbeitung
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierDescription, setTierDescription] = useState('');

  // States für Formular "Kommunikation"
  const [welcomeMessage, setWelcomeMessage] = useState(user?.welcomeMessage || '');

  // Daten synchronisieren, wenn sich der User im Store ändert
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      // setSubscriptionPrice(user.subscriptionPrice ? user.subscriptionPrice.toFixed(2) : '0.00'); // Entfernt
      setWelcomeMessage(user.welcomeMessage || '');
    }
  }, [user]);

  // Tiers laden
  const fetchTiers = async () => {
    if (!user?.id) return;
    setIsTierLoading(true);
    try {
      const fetchedTiers = await tierService.getCreatorTiers(user.id);
      setTiers(fetchedTiers);
    } catch (error) {
      toast({ title: "Fehler", description: "Abo-Stufen konnten nicht geladen werden.", variant: "destructive" });
    } finally {
      setIsTierLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, [user?.id]);


  // --- HANDLER FÜR PROFIL-UPDATES ---
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsAvatarLoading(true);
    try {
        const avatarUrl = await storageService.uploadMedia(file, user.id);
        await updateProfile({ avatar_url: avatarUrl });
        toast({ title: "Profilbild aktualisiert!" });
    } catch (error: any) {
        toast({ title: "Upload fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsAvatarLoading(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsBannerLoading(true);
    try {
        const bannerUrl = await storageService.uploadMedia(file, user.id);
        await updateProfile({ banner_url: bannerUrl });
        toast({ title: "Banner aktualisiert!" });
    } catch (error: any) {
        toast({ title: "Upload fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsBannerLoading(false);
    }
  };

  const handleBrandingSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBrandingLoading(true);
    try {
        await updateProfile({
            display_name: displayName,
        });
        toast({ title: "Branding gespeichert!" });
    } catch (error: any) {
         toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsBrandingLoading(false);
    }
  };

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInfoLoading(true);
    try {
        await updateProfile({
            bio: bio,
        });
        toast({ title: "Informationen gespeichert!" });
    } catch (error: any) {
         toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsInfoLoading(false);
    }
  };

  // --- ENTFERNT: handleMonetizationSave (Basis-Preis) ---
  // const handleMonetizationSave = ...
  // --- ENDE ---

  // --- Kommunikation ---
  const handleCommunicationSave = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCommunicationLoading(true);
      try {
          await updateProfile({
              welcome_message: welcomeMessage
          });
          toast({ title: "Willkommensnachricht gespeichert!" });
      } catch (error: any) {
          toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
      } finally {
          setIsCommunicationLoading(false);
      }
  };

  // --- TIER DIALOG HANDLER (Unverändert) ---
  const openNewTierDialog = () => {
    setCurrentTier(null);
    setTierName('');
    setTierPrice('');
    setTierDescription('');
    setShowTierDialog(true);
  };

  const openEditTierDialog = (tier: Tier) => {
    setCurrentTier(tier);
    setTierName(tier.name);
    setTierPrice(tier.price.toFixed(2));
    setTierDescription(tier.description);
    setShowTierDialog(true);
  };

  const handleTierDialogSave = async () => {
    const price = parseFloat(tierPrice);
    if (!tierName || isNaN(price) || price <= 0) {
      toast({ title: "Fehler", description: "Bitte geben Sie einen gültigen Namen und Preis ein.", variant: "destructive" });
      return;
    }

    setIsTierLoading(true);
    try {
      if (currentTier) {
        // Update
        await tierService.updateTier(currentTier.id, {
          name: tierName,
          price: price,
          description: tierDescription,
        });
        toast({ title: "Stufe aktualisiert!" });
      } else {
        // Create
        await tierService.createTier({
          name: tierName,
          price: price,
          description: tierDescription,
          benefits: [],
        });
        toast({ title: "Stufe erstellt!" });
      }
      await fetchTiers();
      setShowTierDialog(false);
    } catch (error: any) {
      toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
      setIsTierLoading(false);
    }
  };

  const handleTierDelete = async (tierId: string) => {
    if (!window.confirm("Sind Sie sicher, dass Sie diese Stufe löschen möchten?")) {
      return;
    }
    setIsTierLoading(true);
    try {
      await tierService.deleteTier(tierId);
      toast({ title: "Stufe gelöscht" });
      await fetchTiers(); // Liste neu laden
    } catch (error: any) {
      toast({ title: "Löschen fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
      setIsTierLoading(false);
    }
  };
  // --- ENDE TIER HANDLER ---


  return (
    <>
      <div className="space-y-8">
        <Tabs defaultValue="branding" className="w-full">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="branding" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Branding
              </TabsTrigger>
              <TabsTrigger value="info" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Informationen
              </TabsTrigger>
              <TabsTrigger value="monetization" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Monetarisierung
              </TabsTrigger>
              <TabsTrigger value="communication" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                Kommunikation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Visuelle Identität</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBrandingSave} className="space-y-6">
                    {/* ... (Avatar, Banner, DisplayName, Username, Wasserzeichen) ... */}
                    <div className="space-y-4">
                      <Label className="text-foreground">Profilbild</Label>
                      <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24">
                          <AvatarImage src={user?.avatar} alt={user?.name} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                            {user?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          type="button"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isAvatarLoading || isBrandingLoading}
                        >
                          {isAvatarLoading ? (
                              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                              <CameraIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                          )}
                          Profilbild hochladen
                        </Button>
                        <input
                          type="file"
                          ref={avatarInputRef}
                          onChange={handleAvatarUpload}
                          accept="image/png, image/jpeg"
                          className="hidden"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Wichtig: Keine Nacktheit im Profilbild erlaubt
                      </p>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-foreground">Bannerbild</Label>
                      <input
                          type="file"
                          ref={bannerInputRef}
                          onChange={handleBannerUpload}
                          accept="image/png, image/jpeg"
                          className="hidden"
                      />
                      <div
                        onClick={() => bannerInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary transition-colors cursor-pointer relative bg-background min-h-[150px] flex flex-col justify-center"
                      >
                        {user?.bannerUrl && (
                          <img src={user.bannerUrl} alt="Banner-Vorschau" className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50" />
                        )}

                        {isBannerLoading ? (
                          <Loader2Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                        )}

                        <p className="text-foreground mb-2 z-10">
                          {isBannerLoading ? 'Lädt hoch...' : (user?.bannerUrl ? 'Banner ändern' : 'Bannerbild hochladen')}
                        </p>
                        <p className="text-sm text-muted-foreground z-10">Empfohlen: 1920x480px</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="text-foreground">Anzeigename</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-background text-foreground border-border"
                        disabled={isBrandingLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-foreground">Username (@handle)</Label>
                      <Input
                        id="username"
                        value={username}
                        className="bg-neutral text-muted-foreground border-border"
                        disabled // Username kann nicht geändert werden
                        readOnly
                      />
                      <p className="text-xs text-muted-foreground">Der Username (@handle) kann nach der Erstellung nicht mehr geändert werden.</p>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-border">
                      <div>
                        <h3 className="text-foreground font-medium">Wasserzeichen aktivieren</h3>
                        <p className="text-sm text-muted-foreground">
                          (Derzeit nicht implementiert)
                        </p>
                      </div>
                      <Switch
                        checked={watermarkEnabled}
                        onCheckedChange={setWatermarkEnabled}
                        disabled // Deaktiviert, da nicht implementiert
                      />
                    </div>

                    <Button
                      type="submit"
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                      disabled={isBrandingLoading || isAvatarLoading || isBannerLoading}
                    >
                      {isBrandingLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                      Änderungen speichern
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Informationen & Kommunikation</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoSave} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-foreground">Biografie</Label>
                      <Textarea
                        id="bio"
                        placeholder="Beschreiben Sie sich und Ihre Inhalte..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="min-h-32 bg-background text-foreground border-border"
                        disabled={isInfoLoading}
                      />
                    </div>
                    <div className="space-y-2 opacity-50">
                      <Label htmlFor="location" className="text-foreground">Standort (optional)</Label>
                      <Input
                        id="location"
                        placeholder="z.B. Deutschland (Nicht implementiert)"
                        className="bg-background text-foreground border-border"
                        disabled
                      />
                    </div>
                    <div className="space-y-2 opacity-50">
                      <Label htmlFor="twitter" className="text-foreground">Twitter/X (Nicht implementiert)</Label>
                      <Input
                        id="twitter"
                        placeholder="https://twitter.com/username"
                        className="bg-background text-foreground border-border"
                        disabled
                      />
                    </div>
                    <Button
                      type="submit"
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                      disabled={isInfoLoading}
                    >
                      {isInfoLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                      Informationen speichern
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- AKTUALISIERTE MONETARISIERUNGS-TAB --- */}
            <TabsContent value="monetization" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <DollarSignIcon className="w-5 h-5" strokeWidth={1.5} />
                    Monetarisierungseinstellungen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* --- Formular für Basis-Abo ENTFERNT --- */}

                  {/* Abschnitt für Abonnement-Stufen (Tiers) */}
                  <div className="pt-6 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-foreground font-medium">
                        Abonnement-Stufen (Tiers)
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                        onClick={openNewTierDialog}
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Neue Stufe
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                        Fans können nur die Stufen abonnieren, die Sie hier erstellen.
                        Wenn keine Stufen vorhanden sind, können Fans Ihr Profil nicht abonnieren.
                    </p>

                    {isTierLoading && <p className="text-muted-foreground">Lade Stufen...</p>}

                    <div className="space-y-4">
                      {tiers.length === 0 && !isTierLoading && (
                        <p className="text-sm text-muted-foreground">
                          Sie haben noch keine Abonnement-Stufen erstellt.
                        </p>
                      )}
                      {tiers.map((tier) => (
                        <Card key={tier.id} className="bg-background border-border">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-foreground">{tier.name}</h4>
                              <p className="text-secondary text-lg font-serif">
                                {tier.price.toFixed(2)}€
                                <span className="text-sm text-muted-foreground">/Monat</span>
                              </p>
                              <p className="text-sm text-muted-foreground">{tier.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditTierDialog(tier)}>
                                <EditIcon className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleTierDelete(tier.id)}>
                                <Trash2Icon className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* --- ENDE MONETARISIERUNG --- */}


            <TabsContent value="communication" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <MessageSquareIcon className="w-5 h-5" strokeWidth={1.5} />
                    Automatische Nachrichten
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCommunicationSave} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="welcome-message" className="text-foreground">
                          Willkommensnachricht für neue Abonnenten
                      </Label>
                      <Textarea
                          id="welcome-message"
                          placeholder="Verfassen Sie eine automatische Willkommensnachricht..."
                          className="min-h-32 bg-background text-foreground border-border"
                          value={welcomeMessage}
                          onChange={(e) => setWelcomeMessage(e.target.value)}
                          disabled={isCommunicationLoading}
                      />
                      <p className="text-sm text-muted-foreground">
                          Diese Nachricht wird automatisch an jeden neuen Abonnenten gesendet (gilt für alle Stufen).
                      </p>
                    </div>

                    <Button
                        type="submit"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                        disabled={isCommunicationLoading || welcomeMessage === (user?.welcomeMessage || '')}
                    >
                    {isCommunicationLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                    Änderungen speichern
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>

      {/* --- Dialog für Tier Erstellung/Bearbeitung (Unverändert) --- */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {currentTier ? 'Stufe bearbeiten' : 'Neue Stufe erstellen'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Definieren Sie einen Preis und die Vorteile für diese Stufe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tier-name" className="text-foreground">Name</Label>
              <Input
                id="tier-name"
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                placeholder="z.B. VIP Gold"
                className="bg-background text-foreground border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-price" className="text-foreground">Preis (€/Monat)</Label>
              <Input
                id="tier-price"
                type="number"
                value={tierPrice}
                onChange={(e) => setTierPrice(e.target.value)}
                placeholder="z.B. 19.99"
                className="bg-background text-foreground border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tier-description" className="text-foreground">Beschreibung</Label>
              <Textarea
                id="tier-description"
                value={tierDescription}
                onChange={(e) => setTierDescription(e.target.value)}
                placeholder="Kurze Beschreibung der Stufe"
                className="bg-background text-foreground border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral">
                Abbrechen
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleTierDialogSave}
              disabled={isTierLoading}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {isTierLoading ? <Loader2Icon className="w-5 h-5 animate-spin" /> : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}