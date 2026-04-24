import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MapPinIcon, Loader2Icon, LockIcon, Building2Icon, ShieldCheckIcon, AlertCircleIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { authService } from '../../services/authService';

interface CreatorAddressGateProps {
  children: React.ReactNode;
}

export default function CreatorAddressGate({ children }: CreatorAddressGateProps) {
  const { user, updateProfile, setUser } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    street: user?.address_street || '',
    city: user?.address_city || '',
    zip: user?.address_zip || '',
    country: user?.address_country || 'Deutschland',
  });

  const isVerified = user?.identity_verification_status === 'verified';
  const hasAddress = !!user?.address_street;
  const isStripeConnected = !!user?.stripe_onboarding_complete;

  // Abfangen der Rückkehr von Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true' && user?.id) {
      // In der DB aktualisieren (vorsorglich, falls Webhook noch nicht da)
      // Wir setzen es auf true, da der User den Stripe-Flow erfolgreich beendet hat
      const updateAndRefresh = async () => {
        try {
          await authService.updateProfile(user.id, { stripe_onboarding_complete: true } as any);
          const profile = await authService.getCurrentUserFullProfile();
          if (profile) {
            setUser(profile as any);
            toast({
              title: "Stripe verbunden!",
              description: "Dein Konto wurde erfolgreich verknüpft. Du hast nun vollen Zugriff.",
            });
          }
        } catch (err) {
          console.error("Fehler beim Aktualisieren des Stripe-Status:", err);
        }
      };

      updateAndRefresh();
      
      // Parameter aus URL entfernen
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [setUser, toast, user?.id]);

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('connect-stripe-account', {
        body: {
          return_url: window.location.href.split('?')[0] 
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Keine Weiterleitungs-URL erhalten.");
      }
    } catch (err: any) {
      console.error("Fehler beim Verbinden mit Stripe:", err);
      toast({ 
        title: "Fehler", 
        description: "Verbindung zu Stripe fehlgeschlagen. Bitte versuche es später erneut.", 
        variant: "destructive" 
      });
      setIsConnectingStripe(false);
    }
  };

  const handleStartVerification = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-verification-session', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      console.error("Fehler beim Starten der Verifizierung:", err);
      toast({
        title: "Fehler",
        description: "Verifizierung konnte nicht gestartet werden: " + err.message,
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await updateProfile({
        address_street: formData.street,
        address_city: formData.city,
        address_zip: formData.zip,
        address_country: formData.country,
      });
      toast({
        title: "Adresse gespeichert",
        description: "Vielen Dank! Bitte richte nun dein Stripe-Konto für Auszahlungen ein.",
      });
    } catch (err: any) {
      console.error("Fehler beim Speichern der Adresse:", err);
      toast({
        title: "Fehler",
        description: "Die Adresse konnte nicht gespeichert werden. Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isVerified && hasAddress && isStripeConnected) {
    return <>{children}</>;
  }

  // Fall 0: Nicht verifiziert
  if (!isVerified) {
    const status = user?.identity_verification_status || 'none';
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl text-center space-y-6 max-w-lg mx-auto mt-12 shadow-sm">
        <div className="p-4 bg-primary/10 rounded-full">
          <ShieldCheckIcon className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Identität & Alter bestätigen</h2>
          <p className="text-muted-foreground text-sm">
            Um Creator-Funktionen nutzen zu können, müssen wir deine Identität und dein Alter (18+) bestätigen. Dies ist gesetzlich für Creator zwingend erforderlich.
          </p>
        </div>

        {status === 'pending' && (
          <div className="w-full p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3 text-left">
            <Loader2Icon className="w-5 h-5 text-yellow-500 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Prüfung läuft...</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500/80">
                Deine Dokumente werden gerade geprüft. Dies kann einige Minuten dauern. Bitte lade die Seite später neu.
              </p>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-left">
            <AlertCircleIcon className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Verifizierung fehlgeschlagen</p>
              <p className="text-xs text-destructive/80">
                Leider konnten wir deine Identität nicht bestätigen. Bitte versuche es erneut mit einem gut lesbaren Foto deines Ausweises.
              </p>
            </div>
          </div>
        )}

        <div className="w-full space-y-4 pt-4">
          {status !== 'pending' ? (
            <Button
              onClick={handleStartVerification}
              disabled={isVerifying}
              className="w-full h-12 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isVerifying ? (
                <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
              )}
              {isVerifying ? 'Sitzung wird erstellt...' : 'Verifizierung starten'}
            </Button>
          ) : (
             <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-transparent border-border text-foreground hover:bg-neutral"
             >
                Status aktualisieren
             </Button>
          )}
          
          <p className="text-[10px] text-muted-foreground">
            Sicher & Diskret: Deine Ausweisdaten werden verschlüsselt übertragen und nicht dauerhaft auf unseren Servern gespeichert.
          </p>
        </div>
      </div>
    );
  }

  // Fall 1: Keine Adresse
  if (!hasAddress) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl text-center space-y-6 max-w-lg mx-auto mt-12 shadow-sm">
        <div className="p-4 bg-primary/10 rounded-full">
          <MapPinIcon className="w-12 h-12 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Rechnungsadresse erforderlich</h2>
          <p className="text-muted-foreground text-sm">
            Um Creator-Funktionen nutzen zu können und Auszahlungen zu erhalten, müssen wir deine Rechnungsadresse kennen. Dies ist für die steuerliche Abwicklung zwingend erforderlich.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="gate-street">Straße und Hausnummer</Label>
            <Input
              id="gate-street"
              required
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="Musterstraße 123"
              className="bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gate-zip">PLZ</Label>
              <Input
                id="gate-zip"
                required
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="12345"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gate-city">Stadt</Label>
              <Input
                id="gate-city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Berlin"
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gate-country">Land</Label>
            <Input
              id="gate-country"
              required
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Deutschland"
              className="bg-background border-border"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg font-semibold mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <LockIcon className="w-5 h-5 mr-2" />
            )}
            Speichern & Weiter
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground">
          Deine Daten werden sicher übertragen und nur für gesetzlich vorgeschriebene Zwecke (Abrechnungen & Steuern) verwendet.
        </p>
      </div>
    );
  }

  // Fall 2: Adresse da, aber Stripe fehlt
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl text-center space-y-6 max-w-lg mx-auto mt-12 shadow-sm">
      <div className="p-4 bg-secondary/10 rounded-full">
        <Building2Icon className="w-12 h-12 text-secondary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Stripe Connect einrichten</h2>
        <p className="text-muted-foreground text-sm">
          Deine Adresse wurde gespeichert. Um nun Geld verdienen und Auszahlungen erhalten zu können, musst du dein Konto mit Stripe verbinden.
        </p>
      </div>

      <div className="w-full space-y-4">
        <Button
          onClick={handleConnectStripe}
          disabled={isConnectingStripe}
          className="w-full h-12 text-lg font-semibold mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {isConnectingStripe ? (
            <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Building2Icon className="w-5 h-5 mr-2" />
          )}
          Bankkonto mit Stripe verbinden
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Du wirst zu Stripe weitergeleitet, um dein Bankkonto sicher zu verknüpfen.
        </p>
      </div>
    </div>
  );
}
