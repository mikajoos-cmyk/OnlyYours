import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { ShieldCheckIcon, Loader2Icon, LockIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

interface AgeGateProps {
  children: React.ReactNode;
}

export default function AgeGate({ children }: AgeGateProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isVerified = user?.identity_verification_status === 'verified';
  const isPending = user?.identity_verification_status === 'pending';

  const startVerification = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-verification-session', {
        body: { userId: user?.id }
      });
      
      // Das zeigt uns den genauen Inhalt in der Chrome Entwicklerkonsole
      console.log("Antwort der Edge Function:", data);
      
      if (error) throw error;

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // HIER werfen wir den Fehler, aber drucken den gesamten Ondato-Inhalt mit aus!
        throw new Error(`Keine Verifizierungs-URL gefunden. Ondato schickte: ${JSON.stringify(data?.rawOndatoData)}`);
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

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl text-center space-y-6 max-w-lg mx-auto mt-12">
      <div className="p-4 bg-primary/10 rounded-full">
        <ShieldCheckIcon className="w-12 h-12 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Altersverifikation erforderlich</h2>
        <p className="text-muted-foreground text-sm">
          Um 18+ Inhalte sehen oder Abonnements abschließen zu können, musst du einmalig dein Alter verifizieren. Dies ist eine gesetzliche Vorgabe (KJM-konform).
        </p>
      </div>

      {isPending ? (
        <div className="w-full p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-2">
            <Loader2Icon className="w-4 h-4 animate-spin" />
            Prüfung läuft...
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-500/80 mt-1">
            Deine Dokumente werden gerade geprüft. Das dauert meist nur wenige Minuten.
          </p>
          <Button 
            variant="outline" 
            className="mt-4 w-full"
            onClick={() => window.location.reload()}
          >
            Status aktualisieren
          </Button>
        </div>
      ) : (
        <Button
          onClick={startVerification}
          disabled={isLoading}
          className="w-full h-12 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <LockIcon className="w-5 h-5 mr-2" />
          )}
          Jetzt Identität & Alter bestätigen
        </Button>
      )}

      <p className="text-[10px] text-muted-foreground">
        Sicher & Diskret: Wir nutzen <strong>Ondato</strong>. Deine Ausweisdaten werden nicht bei uns gespeichert.
      </p>
    </div>
  );
}
