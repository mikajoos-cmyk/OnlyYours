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
import { CameraIcon, ImageIcon, DollarSignIcon, MessageSquareIcon, Loader2Icon } from 'lucide-react';
// --- NEUE IMPORTS ---
import { storageService } from '../../services/storageService';
import { useToast } from '../../hooks/use-toast';
// --- ENDE NEUE IMPORTS ---

export default function CreatorProfile() {
  const { user, updateProfile } = useAuthStore();
  const { toast } = useToast();
  
  // Refs für Datei-Inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Ladezustände
  const [isBrandingLoading, setIsBrandingLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isBannerLoading, setIsBannerLoading] = useState(false);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  const [isMonetizationLoading, setIsMonetizationLoading] = useState(false);
  
  // States für Formular "Branding"
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true); // UI-only

  // States für Formular "Informationen"
  const [bio, setBio] = useState(user?.bio || '');
  
  // States für Formular "Monetarisierung"
  const [subscriptionPrice, setSubscriptionPrice] = useState(
    user?.subscriptionPrice ? user.subscriptionPrice.toFixed(2) : '0.00'
  );

  // States für Formular "Kommunikation"
  const [welcomeMessage, setWelcomeMessage] = useState(''); // DB-Feld fehlt noch

  // Daten synchronisieren, wenn sich der User im Store ändert
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setSubscriptionPrice(user.subscriptionPrice ? user.subscriptionPrice.toFixed(2) : '0.00');
    }
  }, [user]);
  
  // --- HANDLER FÜR PROFIL-UPDATES ---
  
  // --- Branding ---
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
        // 'username' (handle) kann nicht geändert werden, nur 'display_name'
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

  // --- Informationen ---
  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInfoLoading(true);
    try {
        await updateProfile({
            bio: bio,
            // Weitere Felder wie location/socials hier hinzufügen,
            // wenn das DB-Schema (users table) sie unterstützt.
        });
        toast({ title: "Informationen gespeichert!" });
    } catch (error: any) {
         toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsInfoLoading(false);
    }
  };

  // --- Monetarisierung ---
  const handleMonetizationSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMonetizationLoading(true);
    const price = parseFloat(subscriptionPrice);
    if (isNaN(price) || price < 0) {
        toast({ title: "Fehler", description: "Ungültiger Preis. Bitte geben Sie eine positive Zahl ein.", variant: "destructive" });
        setIsMonetizationLoading(false);
        return;
    }

    try {
        await updateProfile({
            subscription_price: price,
        });
        toast({ title: "Monetarisierung gespeichert!" });
    } catch (error: any) {
         toast({ title: "Speichern fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsMonetizationLoading(false);
    }
  };

  // --- Kommunikation (noch nicht implementiert) ---
  const handleCommunicationSave = async (e: React.FormEvent) => {
      e.preventDefault();
      toast({ title: "Noch nicht implementiert", description: "Das Speichern von automatischen Nachrichten ist noch nicht verfügbar." });
  };


  return (
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

                  {/* Platzhalter für zukünftige Felder */}
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

          <TabsContent value="monetization" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <DollarSignIcon className="w-5 h-5" strokeWidth={1.5} />
                  Monetarisierungseinstellungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMonetizationSave} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="subscription-price" className="text-foreground">
                      Monatlicher Abonnementpreis
                    </Label>
                    <div className="relative">
                      <Input
                        id="subscription-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={subscriptionPrice}
                        onChange={(e) => setSubscriptionPrice(e.target.value)}
                        className="bg-background text-foreground border-border pr-12"
                        disabled={isMonetizationLoading}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        €/Monat
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Empfohlen: 4,99€ - 49,99€. (0€ für kostenloses Profil).</p>
                  </div>

                  <div className="border-t border-border pt-6 opacity-50">
                    <h3 className="text-foreground font-medium mb-4">Abonnement-Stufen (Tiers)</h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                      disabled
                    >
                      Neue Stufe hinzufügen (Nicht implementiert)
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    disabled={isMonetizationLoading}
                  >
                     {isMonetizationLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                    Preis speichern
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquareIcon className="w-5 h-5" strokeWidth={1.5} />
                  Automatische Nachrichten (Nicht implementiert)
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
                        disabled
                    />
                    <p className="text-sm text-muted-foreground">
                        Diese Funktion ist noch nicht implementiert, da sie ein separates DB-Feld erfordert.
                    </p>
                    </div>

                    <Button 
                        type="submit"
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                        disabled
                    >
                    Änderungen speichern
                    </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}