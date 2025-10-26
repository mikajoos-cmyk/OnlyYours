import { useState } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, ChromeIcon, AppleIcon, UserIcon, KeyRoundIcon } from 'lucide-react'; // KeyRoundIcon hinzugefügt
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';

interface AuthModalProps {
  onComplete: () => void;
}

export default function AuthModal({ onComplete }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  // --- Verwende register und login aus dem Store ---
  const { login, register } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  // --- NEU: State für Schritt (auth oder verify) und Verifizierungscode ---
  const [step, setStep] = useState<'auth' | 'verify'>('auth');
  const [verificationCode, setVerificationCode] = useState('');
  // --- ENDE NEU ---

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ageVerified) {
      toast({
        title: 'Altersverifizierung erforderlich',
        description: 'Bitte bestätigen Sie, dass Sie über 18 Jahre alt sind.',
        variant: 'destructive',
      });
      return;
    }

    if (isLogin) {
      // --- Login-Logik ---
      try {
        await login(email, password);
        onComplete(); // Direkt weiter nach Login
      } catch (error) {
        toast({
          title: 'Anmeldung fehlgeschlagen',
          description: 'Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.',
          variant: 'destructive',
        });
      }
    } else {
      // --- Registrierungs-Logik ---
      if (!username.trim()) {
         toast({ title: 'Registrierung fehlgeschlagen', description: 'Bitte geben Sie einen Benutzernamen an.', variant: 'destructive'});
         return;
      }
      if (password !== confirmPassword) {
        toast({ title: 'Registrierung fehlgeschlagen', description: 'Die Passwörter stimmen nicht überein.', variant: 'destructive'});
        return;
      }
      if (!termsAgreed) {
        toast({ title: 'Registrierung fehlgeschlagen', description: 'Bitte stimmen Sie den Nutzungsbedingungen zu.', variant: 'destructive'});
        return;
      }

      // --- Registrierungs-Simulation ---
      try {
        await register(username, email, password); // Simulierten Register-Aufruf verwenden
        toast({
          title: 'Registrierung erfolgreich!',
          description: 'Bitte überprüfen Sie Ihre E-Mails und geben Sie den Code ein.',
        });
        // --- NEU: Wechsle zum Verifizierungs-Schritt ---
        setStep('verify');
        // --- ENDE NEU ---
      } catch (error) {
         toast({
          title: 'Registrierung fehlgeschlagen',
          description: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          variant: 'destructive',
        });
      }
      // --- ENDE Registrierungs-Simulation ---
    }
  };

  // --- NEU: Funktion zum Verarbeiten des Verifizierungscodes ---
  const handleVerificationSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Hier wäre normalerweise ein API-Aufruf zur Überprüfung des Codes
      console.log('Verifizierungscode eingegeben:', verificationCode);

      // Simuliere Erfolg
      if (verificationCode === "123456") { // Beispiel-Code
          toast({
              title: 'E-Mail verifiziert!',
              description: 'Ihr Konto ist jetzt aktiv.',
          });
          onComplete(); // Weiterleiten nach erfolgreicher Verifizierung
      } else {
          toast({
              title: 'Verifizierung fehlgeschlagen',
              description: 'Der eingegebene Code ist ungültig.',
              variant: 'destructive',
          });
      }
  };
  // --- ENDE NEU ---

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center min-h-screen px-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-card rounded-lg p-8 space-y-6"
      >
        {/* --- Bedingtes Rendern basierend auf 'step' --- */}
        {step === 'auth' ? (
          <>
            {/* --- Auth-Formular (Login/Register) --- */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-foreground">
                {isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {isLogin
                  ? 'Melden Sie sich an, um fortzufahren'
                  : 'Erstellen Sie Ihr exklusives Konto'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Benutzername (nur bei Registrierung) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Benutzername</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="username" type="text" placeholder="Ihr Benutzername" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10 bg-background text-foreground border-border" required={!isLogin} />
                  </div>
                </div>
              )}

              {/* E-Mail */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-Mail</Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="ihre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-background text-foreground border-border" required />
                </div>
              </div>

              {/* Passwort */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Passwort</Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-background text-foreground border-border" required />
                </div>
              </div>

              {/* Passwort bestätigen (nur bei Registrierung) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Passwort bestätigen</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 bg-background text-foreground border-border" required={!isLogin} />
                  </div>
                </div>
              )}

              {/* Altersverifizierung */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="age" checked={ageVerified} onCheckedChange={(checked) => setAgeVerified(checked as boolean)} />
                <Label htmlFor="age" className="text-sm text-foreground cursor-pointer">Ich bestätige, dass ich über 18 Jahre alt bin</Label>
              </div>

              {/* AGB (nur bei Registrierung) */}
              {!isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={termsAgreed} onCheckedChange={(checked) => setTermsAgreed(checked as boolean)} />
                  <Label htmlFor="terms" className="text-sm text-foreground cursor-pointer">Ich stimme den <a href="/terms" target="_blank" className="text-secondary hover:underline">Nutzungsbedingungen</a> zu</Label>
                </div>
              )}

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                {isLogin ? 'Anmelden' : 'Registrieren'}
              </Button>
            </form>

            {/* Trenner und Social Logins */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder fortfahren mit</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral"><ChromeIcon className="mr-2 w-5 h-5" />Google</Button>
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral"><AppleIcon className="mr-2 w-5 h-5" />Apple</Button>
            </div>

            {/* Wechsel zwischen Login/Register */}
            <div className="text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-secondary hover:text-secondary/80 transition-colors">
                {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* --- NEU: Verifizierungs-Formular --- */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-foreground">
                E-Mail bestätigen
              </h2>
              <p className="text-muted-foreground text-sm">
                Wir haben einen Code an {email} gesendet. Bitte geben Sie ihn unten ein.
              </p>
            </div>

            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-foreground">
                  Verifizierungscode
                </Label>
                <div className="relative">
                   <KeyRoundIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                   <Input
                      id="verificationCode"
                      type="text" // Oder "number", wenn es nur Zahlen sind
                      placeholder="XXXXXX"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10 bg-background text-foreground border-border tracking-[0.3em] text-center" // Tracking für Buchstabenabstand
                      maxLength={6} // Bdefreispiel: 6-stelliger Code
                      required
                   />
                </div>
              </div>

               <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal">
                 Bestätigen
               </Button>
            </form>

            <div className="text-center text-sm">
                <button type="button" /* onClick={resendCodeFunction} */ className="text-secondary hover:text-secondary/80 transition-colors">
                    Code erneut senden
                </button>
            </div>
            {/* --- ENDE NEU --- */}
          </>
        )}
        {/* --- Ende bedingtes Rendern --- */}

      </motion.div>
    </motion.div>
  );
}