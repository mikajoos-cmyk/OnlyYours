// src/components/profile/FanProfile.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../stores/authStore';
import { subscriptionService, Subscription } from '../../services/subscriptionService';
// --- NEUE IMPORTS ---
import { storageService } from '../../services/storageService';
import { paymentService, PaymentTransaction } from '../../services/paymentService';
import { useToast } from '../../hooks/use-toast';
import { CameraIcon, ShieldIcon, CreditCardIcon, Loader2Icon } from 'lucide-react';
// --- ENDE NEUE IMPORTS ---

// Typ für Abos (angepasst an das, was wir wirklich brauchen)
interface ActiveSubscription {
  id: string;
  creator: { name: string };
  price: number;
  endDate: string | null;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED';
}

export default function FanProfile() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States für Daten
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States für Formular "Konto"
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  // States für Formular "Sicherheit"
  const [currentPassword, setCurrentPassword] = useState(''); // Supabase 'updateUser' braucht dies nicht
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false); // UI-only

  // --- FEHLERBEHEBUNG: formatCurrency-Funktion hier definieren ---
  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  // --- ENDE FEHLERBEHEBUNG ---

  // Daten (Abos und Transaktionen) beim Laden fetchen
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Lade aktive Abonnements
        const subs: Subscription[] = await subscriptionService.getUserSubscriptions();
        const mappedSubs = subs.map(s => ({
            id: s.id,
            creator: { name: s.creator?.name || 'Unbekannter Creator' },
            price: s.price,
            endDate: s.endDate,
            status: s.status
        }));
        setActiveSubscriptions(mappedSubs || []);

        // Lade Transaktionen
        const paymentHistory = await paymentService.getUserPaymentHistory(user.id);
        setTransactions(paymentHistory || []);

      } catch (err) {
        setError('Fehler beim Laden der Daten.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Benutzerdaten in Formular synchronisieren, wenn sich der 'user' im Store ändert
  useEffect(() => {
    if (user) {
        setDisplayName(user.name || '');
        setEmail(user.email || '');
    }
  }, [user]);

  // --- HANDLER FÜR PROFIL-UPDATES ---

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsAvatarLoading(true);
    try {
        const avatarUrl = await storageService.uploadMedia(file, user.id);
        await updateProfile({ avatar_url: avatarUrl });
        toast({ title: "Profilbild aktualisiert!" });
    } catch (error: any) {
        toast({ title: "Fehler beim Upload", description: error.message, variant: "destructive" });
    } finally {
        setIsAvatarLoading(false);
    }
  };

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccountLoading(true);
    try {
        await updateProfile({ display_name: displayName });
        // E-Mail-Änderung erfordert spezielle Supabase-Handhabung (Bestätigung)
        // Vorerst nur 'display_name'
        toast({ title: "Profil aktualisiert!" });
    } catch (error: any) {
        toast({ title: "Update fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsAccountLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        toast({ title: "Fehler", description: "Die neuen Passwörter stimmen nicht überein.", variant: "destructive" });
        return;
    }
    if (newPassword.length < 6) {
        toast({ title: "Fehler", description: "Das Passwort muss mindestens 6 Zeichen lang sein.", variant: "destructive" });
        return;
    }

    setIsPasswordLoading(true);
    try {
        await changePassword(newPassword);
        toast({ title: "Passwort erfolgreich geändert!" });
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword(''); // Aktuelles PW-Feld leeren
    } catch (error: any) {
         toast({ title: "Passwortänderung fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
        setIsPasswordLoading(false);
    }
  };

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
            <CardContent>
              <form onSubmit={handleAccountUpdate} className="space-y-6">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAvatarLoading}
                  >
                    {isAvatarLoading ? (
                        <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                        <CameraIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                    )}
                    Profilbild ändern
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/png, image/jpeg"
                    className="hidden"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Anzeigename</Label>
                  <Input
                    id="username"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">E-Mail-Adresse</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    className="bg-neutral text-muted-foreground border-border"
                    disabled // E-Mail-Änderung ist ein komplexerer Flow
                    readOnly
                  />
                   <p className="text-xs text-muted-foreground">E-Mail-Änderungen erfordern eine Bestätigung und sind hier nicht implementiert.</p>
                </div>

                <Button
                    type="submit"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    disabled={isAccountLoading || displayName === user?.name}
                >
                  {isAccountLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                  Änderungen speichern
                </Button>
              </form>
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
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">

                 <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">Neues Passwort</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-background text-foreground border-border"
                    placeholder="Mindestens 6 Zeichen"
                  />
                </div>

                 <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">Neues Passwort bestätigen</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background text-foreground border-border"
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-t border-border">
                  <div>
                    <h3 className="text-foreground font-medium">Zwei-Faktor-Authentifizierung</h3>
                    <p className="text-sm text-muted-foreground">Zusätzliche Sicherheit (derzeit nicht verfügbar)</p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                    disabled // Deaktiviert, da nicht implementiert
                  />
                </div>

                <Button
                    type="submit"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    disabled={isPasswordLoading || !newPassword || !confirmPassword}
                >
                   {isPasswordLoading && <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />}
                  Passwort ändern
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Aktive Abonnements</CardTitle>
            </CardHeader>
            <CardContent>
               {loading && <p className="text-muted-foreground">Lade Abonnements...</p>}
               {error && <p className="text-destructive">{error}</p>}
               {!loading && !error && activeSubscriptions.length === 0 && <p className="text-muted-foreground">Keine aktiven Abonnements.</p>}
              <div className="space-y-4">
                {!loading && !error && activeSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-4 border-b border-border last:border-0"
                  >
                    <div>
                      <h3 className="text-foreground font-medium">{sub.creator.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sub.status === 'CANCELED' ?
                            `Gekündigt, läuft ab am: ${sub.endDate ? new Date(sub.endDate).toLocaleDateString('de-DE') : 'N/A'}` :
                            `Nächste Abrechnung: ${sub.endDate ? new Date(sub.endDate).toLocaleDateString('de-DE') : 'N/A'}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-secondary font-medium">{formatCurrency(sub.price)}/Monat</span>
                      <Button
                        variant="outline"
                        className="bg-background text-foreground border-border hover:bg-neutral font-normal"
                        disabled={sub.status === 'CANCELED'} // Deaktiviere, wenn schon gekündigt
                        onClick={async () => {
                            try {
                                await subscriptionService.cancelSubscription(sub.id);
                                toast({ title: "Abonnement gekündigt" });
                                // Lade Daten neu, um Status zu aktualisieren
                                const subs = await subscriptionService.getUserSubscriptions();
                                setActiveSubscriptions(subs.map(s => ({
                                    id: s.id,
                                    creator: { name: s.creator?.name || 'Unbekannter Creator' },
                                    price: s.price,
                                    endDate: s.endDate,
                                    status: s.status
                                })));
                            } catch (error: any) {
                                toast({ title: "Fehler", description: error.message, variant: "destructive" });
                            }
                        }}
                      >
                        {sub.status === 'CANCELED' ? 'Gekündigt' : 'Kündigen'}
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
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal" disabled>
                  Zahlungsmethode hinzufügen
                </Button>
                 <p className="text-xs text-muted-foreground mt-2">Zahlungsverwaltung (Stripe/PayPal) noch nicht implementiert.</p>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-foreground font-medium mb-4">Transaktionshistorie</h3>
                 {loading && <p className="text-muted-foreground">Lade Transaktionen...</p>}
                 {error && <p className="text-destructive">{error}</p>}
                 {!loading && !error && transactions.length === 0 && <p className="text-muted-foreground">Keine Transaktionen vorhanden.</p>}
                <div className="space-y-3">
                  {!loading && !error && transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString('de-DE')}</p>
                      </div>
                      <span className="text-foreground font-medium">-{formatCurrency(transaction.amount)}</span>
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