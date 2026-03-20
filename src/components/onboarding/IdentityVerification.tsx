import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, AlertCircleIcon, Loader2Icon, ExternalLinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

interface IdentityVerificationProps {
  onComplete: () => void;
}

export default function IdentityVerification({ onComplete }: IdentityVerificationProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const startVerification = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-verification-session');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Keine Verifizierungs-URL erhalten');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      toast({
        title: 'Fehler',
        description: err.message || 'Verifizierung konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
            Um die gesetzlichen Vorgaben (Jugendschutz) zu erfüllen, leiten wir dich kurz zu unserem Partner Yoti weiter. Halte deinen Ausweis bereit.
          </p>
        </div>

        {status === 'pending' && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3 text-left">
            <Loader2Icon className="w-5 h-5 text-yellow-500 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Prüfung läuft...</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500/80">
                Ihre Dokumente werden gerade geprüft. Dies kann einige Minuten dauern. Bitte laden Sie die Seite später neu.
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
                Leider konnten wir Ihre Identität nicht bestätigen. Bitte versuchen Sie es erneut mit einem deutlichen Foto Ihres Ausweises.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4">
          {status !== 'pending' ? (
            <Button
              onClick={startVerification}
              disabled={isLoading}
              className="w-full h-12 text-lg font-semibold"
            >
              {isLoading ? (
                <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ExternalLinkIcon className="w-5 h-5 mr-2" />
              )}
              Jetzt verifizieren
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
            Wir nutzen <strong>Yoti</strong> für eine sichere Abwicklung. Ihre Ausweisdaten werden nicht auf unseren Servern gespeichert.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
