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
import { storageService } from '../../services/storageService';
import { paymentService, PaymentTransaction, SavedPaymentMethod } from '../../services/paymentService'; // SavedPaymentMethod importieren
import { useToast } from '../../hooks/use-toast';
import { CameraIcon, ShieldIcon, CreditCardIcon, Loader2Icon, Trash2Icon, PlusIcon } from 'lucide-react';
import AddPaymentMethodModal from '../fan/AddPaymentMethodModal'; // Modal importieren

// ... (Interface ActiveSubscription bleibt gleich)

export default function FanProfile() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  // Neuer State für Zahlungsmethoden
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [isMethodsLoading, setIsMethodsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... (Andere States bleiben gleich: displayName, email, passwords etc.)
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Funktion zum Laden der Zahlungsmethoden
  const fetchPaymentMethods = async () => {
    if (!user?.id) return;
    setIsMethodsLoading(true);
    try {
        const methods = await paymentService.getSavedPaymentMethods();
        setPaymentMethods(methods);
    } catch (err) {
        console.error("Fehler beim Laden der Zahlungsmethoden:", err);
    } finally {
        setIsMethodsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Parallel laden
        const [subs, history] = await Promise.all([
            subscriptionService.getUserSubscriptions(),
            paymentService.getUserPaymentHistory(user.id)
        ]);

        // Typ-Anpassung für Frontend-Anzeige
        const mappedSubs = subs.map(s => ({
            id: s.id,
            creator: { name: s.creator?.name || 'Unbekannter Creator' },
            price: s.price,
            endDate: s.endDate,
            status: s.status
        }));
        setActiveSubscriptions(mappedSubs);
        setTransactions(history);

        // Zahlungsmethoden separat laden (damit es nicht alles blockiert)
        fetchPaymentMethods();

      } catch (err) {
        setError('Fehler beim Laden der Daten.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // ... (useEffect für user sync und Handler handleAvatarChange, handleAccountUpdate, handlePasswordChange bleiben gleich) ...
  useEffect(() => {
    if (user) {
        setDisplayName(user.name || '');
        setEmail(user.email || '');
    }
  }, [user]);

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
      } catch (error: any) {
           toast({ title: "Passwortänderung fehlgeschlagen", description: error.message, variant: "destructive" });
      } finally {
          setIsPasswordLoading(false);
      }
  };

  // Handler zum Löschen einer Zahlungsmethode
  const handleDeletePaymentMethod = async (methodId: string) => {
      if(!confirm("Möchten Sie diese Zahlungsmethode wirklich entfernen?")) return;

      try {
          await paymentService.deletePaymentMethod(methodId);
          toast({ title: "Gelöscht", description: "Zahlungsmethode wurde entfernt." });
          fetchPaymentMethods(); // Liste neu laden
      } catch (error: any) {
          toast({ title: "Fehler", description: "Konnte Methode nicht löschen.", variant: "destructive" });
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

        {/* ... TabsContent account, security, subscriptions (bleiben unverändert) ... */}
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
                    disabled
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
                    disabled
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
               {!loading && activeSubscriptions.length === 0 && <p className="text-muted-foreground">Keine aktiven Abonnements.</p>}
              <div className="space-y-4">
                {!loading && activeSubscriptions.map((sub) => (
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
                        disabled={sub.status === 'CANCELED'}
                        onClick={async () => {
                            try {
                                await subscriptionService.cancelSubscription(sub.id);
                                toast({ title: "Abonnement gekündigt" });
                                // Seite neu laden oder State updaten
                                window.location.reload();
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

        {/* --- AKTUALISIERTER ZAHLUNGS-TAB --- */}
        <TabsContent value="payments" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" strokeWidth={1.5} />
                Zahlungsmethoden & Historie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Sektion: Gespeicherte Methoden */}
              <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-foreground font-medium">Gespeicherte Zahlungsmethoden</h3>
                    <Button
                        onClick={() => setShowAddMethodModal(true)}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Hinzufügen
                    </Button>
                </div>

                {isMethodsLoading ? (
                    <p className="text-sm text-muted-foreground">Lade Karten...</p>
                ) : paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Keine Zahlungsmethoden gespeichert.</p>
                ) : (
                    <div className="space-y-3">
                        {paymentMethods.map((method) => (
                            <div key={method.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-neutral p-2 rounded">
                                        <CreditCardIcon className="w-5 h-5 text-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-foreground font-medium capitalize">{method.brand} •••• {method.last4}</p>
                                        <p className="text-xs text-muted-foreground">Läuft ab {method.expMonth}/{method.expYear}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeletePaymentMethod(method.id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* Sektion: Historie */}
              <div className="border-t border-border pt-6">
                <h3 className="text-foreground font-medium mb-4">Transaktionshistorie</h3>
                 {loading && <p className="text-muted-foreground">Lade Transaktionen...</p>}
                 {!loading && transactions.length === 0 && <p className="text-muted-foreground">Keine Transaktionen vorhanden.</p>}
                <div className="space-y-3">
                  {!loading && transactions.map((transaction) => (
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

      {/* Modal für neue Zahlungsmethode */}
      <AddPaymentMethodModal
        isOpen={showAddMethodModal}
        onClose={() => setShowAddMethodModal(false)}
        onSuccess={() => fetchPaymentMethods()} // Liste neu laden bei Erfolg
      />

    </div>
  );
}