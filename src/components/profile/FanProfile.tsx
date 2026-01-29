// src/components/profile/FanProfile.tsx
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { useAuthStore } from '../../stores/authStore';
import { subscriptionService } from '../../services/subscriptionService';
import { storageService } from '../../services/storageService';
import { paymentService, PaymentTransaction, SavedPaymentMethod } from '../../services/paymentService';
import { useToast } from '../../hooks/use-toast';
import { CameraIcon, CreditCardIcon, Loader2Icon, Trash2Icon, PlusIcon, XIcon, SettingsIcon, RefreshCwIcon } from 'lucide-react';
import AddPaymentMethodModal from '../fan/AddPaymentMethodModal';
import ImageCropDialog from './ImageCropDialog';


export default function FanProfile() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [isMethodsLoading, setIsMethodsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [newInterest, setNewInterest] = useState('');

  // Crop dialog states
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [subs, history] = await Promise.all([
        subscriptionService.getUserSubscriptions(),
        paymentService.getUserPaymentHistory(user.id)
      ]);

      const mappedSubs = subs.map(s => ({
        id: s.id,
        creator: { name: s.creator?.name || 'Unbekannter Creator' },
        price: s.price,
        endDate: s.endDate,
        status: s.status,
        autoRenew: s.autoRenew // Wichtig für die UI-Logik
      }));

      setActiveSubscriptions(mappedSubs);
      setTransactions(history);
      fetchPaymentMethods();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setEmail(user.email || '');
      setInterests(user.interests || []);
    }
  }, [user]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Fehler", description: "Bitte wählen Sie eine Bilddatei aus.", variant: "destructive" });
      return;
    }

    // Open crop dialog
    setSelectedImageFile(file);
    setShowCropDialog(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;
    setIsAvatarLoading(true);
    try {
      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const avatarUrl = await storageService.uploadMedia(croppedFile, user.id);
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
      const cleanedInterests = interests.map(t => t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()).filter(t => t.length > 0);
      setInterests(cleanedInterests);
      await updateProfile({ display_name: displayName, interests: cleanedInterests });
      toast({ title: "Profil aktualisiert!" });
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setIsAccountLoading(false);
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() === "" || interests.length >= 10) return;
    const cleanTag = newInterest.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (cleanTag.length > 0 && !interests.includes(cleanTag)) {
      setInterests(prev => [...prev, cleanTag]);
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (tag: string) => setInterests(prev => prev.filter(t => t !== tag));

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast({ title: "Fehler", description: "Passwörter stimmen nicht überein.", variant: "destructive" });
    setIsPasswordLoading(true);
    try {
      await changePassword(newPassword);
      toast({ title: "Passwort geändert!" });
      setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm("Möchten Sie diese Karte wirklich entfernen?")) return;
    try {
      await paymentService.deletePaymentMethod(methodId);
      toast({ title: "Gelöscht", description: "Zahlungsmethode entfernt." });
      fetchPaymentMethods();
    } catch (error: any) {
      toast({ title: "Fehler", description: "Konnte Methode nicht löschen.", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Konto wirklich löschen?")) {
      toast({ title: "Info", description: "Bitte Support kontaktieren.", variant: "default" });
    }
  };

  // --- KÜNDIGEN ---
  const handleCancelSubscription = async (subId: string) => {
    if (!confirm("Abo wirklich kündigen? Es läuft zum Ende des Zeitraums aus.")) return;
    try {
      await subscriptionService.cancelSubscription(subId);
      toast({ title: "Gekündigt", description: "Abo läuft zum Periodenende aus." });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  // --- REAKTIVIEREN ---
  const handleResumeSubscription = async (subId: string) => {
    try {
      await subscriptionService.resumeSubscription(subId);
      toast({ title: "Reaktiviert!", description: "Abo wird automatisch verlängert." });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-card border border-border flex flex-wrap h-auto">
          <TabsTrigger value="account" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex-1">Konto</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex-1">Sicherheit</TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex-1">Abos</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex-1">Zahlungen</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground flex-1">Einstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground">Profil & Interessen</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAccountUpdate} className="space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button type="button" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => fileInputRef.current?.click()} disabled={isAvatarLoading}>
                    {isAvatarLoading ? <Loader2Icon className="animate-spin mr-2" /> : <CameraIcon className="mr-2" />} Bild ändern
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/png, image/jpeg" className="hidden" />
                </div>
                <div className="grid gap-2"><Label>Anzeigename</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-background border-border" /></div>
                <div className="grid gap-2"><Label>E-Mail</Label><Input value={email} className="bg-neutral text-muted-foreground" disabled readOnly /></div>
                <div className="space-y-4 border-t border-border pt-4">
                  <Label>Interessen</Label>
                  <div className="flex flex-wrap gap-2">
                    {interests.map(tag => (
                      <div key={tag} className="flex items-center gap-1 bg-secondary/20 text-secondary rounded-full px-3 py-1 text-sm">#{tag}<XIcon className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveInterest(tag)} /></div>
                    ))}
                  </div>
                  <div className="flex gap-2"><Input placeholder="Neues Interesse..." value={newInterest} onChange={e => setNewInterest(e.target.value)} className="bg-background border-border" /><Button type="button" onClick={handleAddInterest} variant="outline"><PlusIcon className="w-4 h-4" /></Button></div>
                </div>
                <Button type="submit" className="bg-secondary text-secondary-foreground" disabled={isAccountLoading}>{isAccountLoading ? <Loader2Icon className="animate-spin mr-2" /> : "Speichern"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground">Sicherheit</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-2"><Label>Neues Passwort</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-background border-border" /></div>
                <div className="grid gap-2"><Label>Bestätigen</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-background border-border" /></div>
                <Button type="submit" className="bg-secondary text-secondary-foreground" disabled={isPasswordLoading}>{isPasswordLoading ? <Loader2Icon className="animate-spin mr-2" /> : "Passwort ändern"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground">Meine Abonnements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!loading && activeSubscriptions.length === 0 && <p className="text-muted-foreground">Keine aktiven Abonnements.</p>}
                {!loading && activeSubscriptions.map((sub) => {
                  // Logik: Abo gilt als "aktiv verlängernd", wenn Status ACTIVE und autoRenew TRUE ist.
                  const isRenewing = sub.status === 'ACTIVE' && sub.autoRenew;

                  return (
                    <div key={sub.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border py-4 gap-4">
                      <div>
                        <h3 className="font-medium text-lg">{sub.creator.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className={isRenewing ? "text-sm text-success" : "text-sm text-warning"}>
                            {isRenewing ? 'Aktiv' : 'Läuft aus'}
                          </p>
                          {sub.endDate && (
                            <p className="text-xs text-muted-foreground">
                              • {isRenewing ? 'Verlängerung: ' : 'Endet am: '}
                              {new Date(sub.endDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-secondary font-medium text-lg">{formatCurrency(sub.price)}</span>

                        {/* BUTTON WECHSEL */}
                        {isRenewing ? (
                          <Button
                            variant="outline"
                            className="hover:bg-destructive/10 hover:text-destructive border-border"
                            onClick={() => handleCancelSubscription(sub.id)}
                          >
                            Kündigen
                          </Button>
                        ) : (
                          <Button
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            onClick={() => handleResumeSubscription(sub.id)}
                          >
                            <RefreshCwIcon className="w-4 h-4 mr-2" />
                            Reaktivieren
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><CreditCardIcon className="w-5 h-5" /> Zahlungsmethoden</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between"><h3 className="font-medium">Gespeicherte Karten</h3><Button onClick={() => setShowAddMethodModal(true)} className="bg-secondary text-secondary-foreground"><PlusIcon className="w-4 h-4 mr-2" /> Neu</Button></div>
              <div className="space-y-3">
                {paymentMethods.length === 0 && !isMethodsLoading && <p className="text-muted-foreground text-sm">Keine Karten gespeichert.</p>}

                {/* --- HIER DIE ERWEITERTE ANZEIGE --- */}
                {paymentMethods.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-4 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-neutral rounded flex items-center justify-center">
                        <CreditCardIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground capitalize flex items-center gap-2">
                          {m.icon || m.type} <span className="text-muted-foreground">{m.label}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {m.subLabel}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePaymentMethod(m.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2Icon className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
                {/* --- ENDE ERWEITERTE ANZEIGE --- */}

              </div>
              <div className="border-t border-border pt-6"><h3 className="font-medium mb-4">Historie</h3>
                <div className="space-y-3">{transactions.map(t => (<div key={t.id} className="flex justify-between border-b border-border py-2"><div><p>{t.description}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p></div><span>-{formatCurrency(t.amount)}</span></div>))}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Allgemeine Einstellungen</CardTitle>
              <CardDescription>Verwalten Sie Benachrichtigungen und Kontoeinstellungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">E-Mail Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">Erhalten Sie Updates zu neuen Beiträgen.</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="border-t border-destructive/20 pt-6 mt-6">
                <h3 className="text-destructive font-medium mb-2 flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Gefahrenzone</h3>
                <Button variant="destructive" onClick={handleDeleteAccount} className="w-full md:w-auto">
                  Konto löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddPaymentMethodModal isOpen={showAddMethodModal} onClose={() => setShowAddMethodModal(false)} onSuccess={() => fetchPaymentMethods()} />

      {/* --- Image Crop Dialog --- */}
      <ImageCropDialog
        isOpen={showCropDialog}
        imageFile={selectedImageFile}
        onClose={() => {
          setShowCropDialog(false);
          setSelectedImageFile(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}