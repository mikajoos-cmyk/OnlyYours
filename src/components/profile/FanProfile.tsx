import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../stores/authStore';
import { CameraIcon, ShieldIcon, CreditCardIcon, BookmarkIcon } from 'lucide-react';

export default function FanProfile() {
  const { user } = useAuthStore();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const activeSubscriptions = [
    { creator: 'Sophia Laurent', price: '19.99€', nextBilling: '15.02.2024' },
    { creator: 'Isabella Rose', price: '14.99€', nextBilling: '20.02.2024' },
  ];

  const transactions = [
    { date: '10.01.2024', description: 'Abonnement: Sophia Laurent', amount: '19.99€' },
    { date: '08.01.2024', description: 'PPV: Exklusives Video', amount: '9.99€' },
    { date: '05.01.2024', description: 'Trinkgeld: Isabella Rose', amount: '5.00€' },
  ];

  return (
    <div className="space-y-8">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="account" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Konto
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Sicherheit
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Abonnements
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            Zahlungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Grundlegende Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                    {user?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  <CameraIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Profilbild ändern
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <Input
                  id="username"
                  defaultValue={user?.name}
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email}
                  className="bg-background text-foreground border-border"
                />
              </div>

              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                Änderungen speichern
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <ShieldIcon className="w-5 h-5" strokeWidth={1.5} />
                Sicherheit & Privatsphäre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-foreground">Aktuelles Passwort</Label>
                <Input
                  id="current-password"
                  type="password"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-foreground">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="bg-background text-foreground border-border"
                />
              </div>

              <div className="flex items-center justify-between py-4 border-t border-border">
                <div>
                  <h3 className="text-foreground font-medium">Zwei-Faktor-Authentifizierung</h3>
                  <p className="text-sm text-muted-foreground">Zusätzliche Sicherheit für Ihr Konto</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>

              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                Passwort ändern
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Aktive Abonnements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSubscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-4 border-b border-border last:border-0"
                  >
                    <div>
                      <h3 className="text-foreground font-medium">{sub.creator}</h3>
                      <p className="text-sm text-muted-foreground">
                        Nächste Abrechnung: {sub.nextBilling}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-secondary font-medium">{sub.price}/Monat</span>
                      <Button
                        variant="outline"
                        className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                      >
                        Kündigen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" strokeWidth={1.5} />
                Zahlungsmethoden & Historie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-foreground font-medium mb-4">Gespeicherte Zahlungsmethoden</h3>
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                  Zahlungsmethode hinzufügen
                </Button>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-foreground font-medium mb-4">Transaktionshistorie</h3>
                <div className="space-y-3">
                  {transactions.map((transaction, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                      <span className="text-foreground font-medium">{transaction.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
