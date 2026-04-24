import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPinIcon, Loader2Icon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthStore } from '../../stores/authStore';

interface AddressStepProps {
  onComplete: () => void;
}

export default function AddressStep({ onComplete }: AddressStepProps) {
  const { user, updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: user?.address_street || '',
    city: user?.address_city || '',
    zip: user?.address_zip || '',
    country: user?.address_country || 'Deutschland',
  });

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
      onComplete();
    } catch (err: any) {
      console.error("Fehler beim Speichern der Adresse:", err);
      alert("Fehler beim Speichern der Adresse. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md w-full mx-auto p-8 bg-card rounded-2xl shadow-xl border border-border"
    >
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <MapPinIcon className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Rechnungsadresse</h2>
          <p className="text-muted-foreground text-sm">
            Bitte gib deine aktuelle Rechnungsadresse an. Diese wird für deine Auszahlungen und Steuerdokumente benötigt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="street">Straße und Hausnummer</Label>
            <Input
              id="street"
              required
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="Musterstraße 123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zip">PLZ</Label>
              <Input
                id="zip"
                required
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stadt</Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Berlin"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Land</Label>
            <Input
              id="country"
              required
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Deutschland"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg font-semibold mt-4"
          >
            {loading && <Loader2Icon className="w-5 h-5 animate-spin mr-2" />}
            Speichern & Weiter
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
