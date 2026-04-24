import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { MapPinIcon, Loader2Icon, LockIcon } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface CreatorAddressGateProps {
  children: React.ReactNode;
}

export default function CreatorAddressGate({ children }: CreatorAddressGateProps) {
  const { user, updateProfile } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: user?.address_street || '',
    city: user?.address_city || '',
    zip: user?.address_zip || '',
    country: user?.address_country || 'Deutschland',
  });

  const hasAddress = !!user?.address_street;

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
        description: "Vielen Dank! Du hast nun Zugriff auf deine Creator-Funktionen.",
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

  if (hasAddress) {
    return <>{children}</>;
  }

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
          Speichern & Zugriff freischalten
        </Button>
      </form>

      <p className="text-[10px] text-muted-foreground">
        Deine Daten werden sicher übertragen und nur für gesetzlich vorgeschriebene Zwecke (Abrechnungen & Steuern) verwendet.
      </p>
    </div>
  );
}
