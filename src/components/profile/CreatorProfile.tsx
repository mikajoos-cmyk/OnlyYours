import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../stores/authStore';
import { CameraIcon, ImageIcon, DollarSignIcon, MessageSquareIcon } from 'lucide-react';

export default function CreatorProfile() {
  const { user } = useAuthStore();
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState('19.99');

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
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-foreground">Profilbild</Label>
                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                        {user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                      <CameraIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      Profilbild hochladen
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Wichtig: Keine Nacktheit im Profilbild erlaubt
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-foreground">Bannerbild</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-secondary transition-colors cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-foreground mb-2">Bannerbild hochladen</p>
                    <p className="text-sm text-muted-foreground">Empfohlen: 1920x480px</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-foreground">Anzeigename</Label>
                  <Input
                    id="display-name"
                    defaultValue={user?.name}
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Username (@handle)</Label>
                  <Input
                    id="username"
                    defaultValue={`@${user?.name?.toLowerCase().replace(' ', '')}`}
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div>
                    <h3 className="text-foreground font-medium">Wasserzeichen aktivieren</h3>
                    <p className="text-sm text-muted-foreground">
                      Automatisch auf alle Uploads anwenden
                    </p>
                  </div>
                  <Switch
                    checked={watermarkEnabled}
                    onCheckedChange={setWatermarkEnabled}
                  />
                </div>

                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  Änderungen speichern
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Informationen & Kommunikation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">Biografie</Label>
                  <Textarea
                    id="bio"
                    placeholder="Beschreiben Sie sich und Ihre Inhalte..."
                    className="min-h-32 bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-foreground">Standort (optional)</Label>
                  <Input
                    id="location"
                    placeholder="z.B. Deutschland"
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter" className="text-foreground">Twitter/X</Label>
                  <Input
                    id="twitter"
                    placeholder="https://twitter.com/username"
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-foreground">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="https://instagram.com/username"
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules" className="text-foreground">Regeln & Grenzen</Label>
                  <Textarea
                    id="rules"
                    placeholder="Legen Sie klare Verhaltensregeln fest..."
                    className="min-h-32 bg-background text-foreground border-border"
                  />
                </div>

                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  Änderungen speichern
                </Button>
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
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subscription-price" className="text-foreground">
                    Monatlicher Abonnementpreis
                  </Label>
                  <div className="relative">
                    <Input
                      id="subscription-price"
                      type="number"
                      value={subscriptionPrice}
                      onChange={(e) => setSubscriptionPrice(e.target.value)}
                      className="bg-background text-foreground border-border pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €/Monat
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Empfohlen: 4,99€ - 49,99€</p>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-foreground font-medium mb-4">Abonnement-Stufen (Tiers)</h3>
                  <Button
                    variant="outline"
                    className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                  >
                    Neue Stufe hinzufügen
                  </Button>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="text-foreground font-medium mb-4">Fundraising-Ziel</h3>
                  <div className="space-y-4">
                    <Input
                      placeholder="Titel des Ziels"
                      className="bg-background text-foreground border-border"
                    />
                    <Input
                      type="number"
                      placeholder="Zielbetrag in €"
                      className="bg-background text-foreground border-border"
                    />
                    <Textarea
                      placeholder="Beschreibung..."
                      className="bg-background text-foreground border-border"
                    />
                  </div>
                </div>

                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  Änderungen speichern
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquareIcon className="w-5 h-5" strokeWidth={1.5} />
                  Automatische Nachrichten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="welcome-message" className="text-foreground">
                    Willkommensnachricht für neue Abonnenten
                  </Label>
                  <Textarea
                    id="welcome-message"
                    placeholder="Verfassen Sie eine automatische Willkommensnachricht..."
                    className="min-h-32 bg-background text-foreground border-border"
                  />
                  <p className="text-sm text-muted-foreground">
                    Diese Nachricht wird automatisch an jeden neuen Abonnenten gesendet
                  </p>
                </div>

                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  Änderungen speichern
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
