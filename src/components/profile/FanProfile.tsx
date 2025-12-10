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
import { CameraIcon, ShieldIcon, CreditCardIcon, Loader2Icon, Trash2Icon, PlusIcon, XIcon, SettingsIcon } from 'lucide-react';
import AddPaymentMethodModal from '../fan/AddPaymentMethodModal';
import { useNavigate } from 'react-router-dom';

export default function FanProfile() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [isMethodsLoading, setIsMethodsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [newInterest, setNewInterest] = useState('');

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

  useEffect(() => {
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
          status: s.status
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
      const cleanedInterests = interests
        .map(t => t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())
        .filter(t => t.length > 0);
      setInterests(cleanedInterests);
      await updateProfile({ display_name: displayName, interests: cleanedInterests });
      toast({ title: "Profil aktualisiert!" });
    } catch (error: any) {
      toast({ title: "Update fehlgeschlagen", description: error.message, variant: "destructive" });
    } finally {
      setIsAccountLoading(false);
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() === "") return;
    if (interests.length >= 10) {
      toast({ title: "Limit erreicht", variant: "destructive" });
      return;
    }
    const cleanTag = newInterest.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    if (cleanTag.length > 0 && !interests.includes(cleanTag)) {
      setInterests(prev => [...prev, cleanTag]);
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (tagToRemove: string) => {
    setInterests(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Passwörter stimmen nicht überein.", variant: "destructive" });
      return;
    }
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
    const confirmed = window.confirm("ACHTUNG: Diese Aktion kann nicht rückgängig gemacht werden. Ihr Konto und alle Daten werden dauerhaft gelöscht. Fortfahren?");
    if (!confirmed) return;

    try {
      // Hier würdest du eine Funktion aufrufen wie `await authService.deleteAccount();`
      // Da Supabase Client keine direkte User-Löschung erlaubt (nur Admin),
      // müsste dies über eine Edge Function geschehen.
      toast({ title: "Information", description: "Bitte kontaktieren Sie den Support (support@onlyyours.app) zur Löschung.", variant: "default" });
    } catch (e) {
      toast({ title: "Fehler", description: "Konto konnte nicht gelöscht werden.", variant: "destructive" });
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

        {/* ACCOUNT TAB */}
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

        {/* SECURITY TAB */}
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

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground">Meine Abonnements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!loading && activeSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center border-b border-border py-4">
                    <div><h3 className="font-medium">{sub.creator.name}</h3><p className="text-sm text-muted-foreground">{sub.status === 'CANCELED' ? 'Gekündigt' : 'Aktiv'}</p></div>
                    <div className="flex items-center gap-4"><span className="text-secondary">{formatCurrency(sub.price)}</span><Button variant="outline" onClick={async () => { await subscriptionService.cancelSubscription(sub.id); toast({ title: "Gekündigt" }); window.location.reload(); }}>Kündigen</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><CreditCardIcon className="w-5 h-5" /> Zahlungsmethoden</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between"><h3 className="font-medium">Gespeicherte Karten</h3><Button onClick={() => setShowAddMethodModal(true)} className="bg-secondary text-secondary-foreground"><PlusIcon className="w-4 h-4 mr-2" /> Neu</Button></div>
              <div className="space-y-3">
                {paymentMethods.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 border border-border rounded"><div className="flex gap-3"><CreditCardIcon /><p className="capitalize">{m.brand} •••• {m.last4}</p></div><Button variant="ghost" size="icon" onClick={() => handleDeletePaymentMethod(m.id)}><Trash2Icon className="w-4 h-4" /></Button></div>
                ))}
              </div>
              <div className="border-t border-border pt-6"><h3 className="font-medium mb-4">Historie</h3>
                <div className="space-y-3">{transactions.map(t => (<div key={t.id} className="flex justify-between border-b border-border py-2"><div><p>{t.description}</p><p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p></div><span>-{formatCurrency(t.amount)}</span></div>))}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Benachrichtigungen</Label>
                  <p className="text-sm text-muted-foreground">Benachrichtigungen im Browser.</p>
                </div>
                <Switch checked={false} disabled />
              </div>

              <div className="border-t border-destructive/20 pt-6 mt-6">
                <h3 className="text-destructive font-medium mb-2 flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Gefahrenzone</h3>
                <p className="text-sm text-muted-foreground mb-4">Das Löschen des Kontos ist endgültig und kann nicht widerrufen werden.</p>
                <Button variant="destructive" onClick={handleDeleteAccount} className="w-full md:w-auto">
                  Konto löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <AddPaymentMethodModal isOpen={showAddMethodModal} onClose={() => setShowAddMethodModal(false)} onSuccess={() => fetchPaymentMethods()} />
    </div>
  );
}