import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react';
import { Button } from '../ui/button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export default function IdentityVerification() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    setLoading(true);
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
      alert("Fehler: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const status = user?.identity_verification_status || 'none';

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
            <ShieldCheckIcon className="w-12 h-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Identität & Alter bestätigen</h2>
          <p className="text-muted-foreground text-sm">
            Um den deutschen Jugendschutzrichtlinien (KJM) zu entsprechen, müssen wir dich kurz verifizieren. Halte deinen Ausweis bereit.
          </p>
        </div>

        {status === 'pending' && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3 text-left">
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
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3 text-left">
            <AlertCircleIcon className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Verifizierung fehlgeschlagen</p>
              <p className="text-xs text-destructive/80">
                Leider konnten wir deine Identität nicht bestätigen. Bitte versuche es erneut mit einem gut lesbaren Foto deines Ausweises.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4">
          {status !== 'pending' ? (
            <Button
              onClick={startVerification}
              disabled={loading}
              className="w-full h-12 text-lg font-semibold"
            >
              {loading && <Loader2Icon className="w-5 h-5 animate-spin mr-2" />}
              {loading ? 'Sitzung wird erstellt...' : 'Verifizierung starten'}
            </Button>
          ) : (
             <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full h-12"
             >
                Status aktualisieren
             </Button>
          )}
          
          <p className="text-[10px] text-muted-foreground">
            Sicher & Diskret: Wir nutzen <strong>Ondato</strong> für die Verifizierung. Deine Ausweisdaten werden nicht auf unseren Servern gespeichert.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
