// src/components/onboarding/AuthModal.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, ChromeIcon, AppleIcon, UserIcon, KeyRoundIcon, Loader2Icon, CheckIcon, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

interface AuthModalProps {
  onComplete: () => void;
}

type ValidationStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function AuthModal({ onComplete }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const { login, register, verifyOtp, resendOtp, checkUsernameAvailability } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [step, setStep] = useState<'auth' | 'verify'>('auth');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Debounced-Effekt für Username-Validierung
  useEffect(() => {
    if (isLogin || !username) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (username.length < 3) {
      setUsernameStatus('taken');
      setUsernameError('Muss mindestens 3 Zeichen lang sein.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('taken');
      setUsernameError('Nur Kleinbuchstaben, Zahlen und _ erlaubt.');
      return;
    }

    setUsernameError(null);
    setUsernameStatus('checking');

    debounceTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) {
          setUsernameStatus('available');
          setUsernameError(null);
        } else {
          setUsernameStatus('taken');
          setUsernameError('Benutzername ist bereits vergeben.');
        }
      } catch (error) {
        setUsernameStatus('taken');
        setUsernameError('Fehler bei der Prüfung.');
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [username, isLogin, checkUsernameAvailability]);


  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!ageVerified) {
      toast({
        title: 'Altersverifizierung erforderlich',
        description: 'Bitte bestätigen Sie, dass Sie über 18 Jahre alt sind.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (isLogin) {
      // --- Login-Logik ---
      try {
        await login(email, password);
        // onComplete() wird durch den authStore-Listener (initialize) aufgerufen
      } catch (error: any) {
        toast({
          title: 'Anmeldung fehlgeschlagen',
          description: error.message || 'Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.',
          variant: 'destructive',
        });
      }
    } else {
      // --- Registrierungs-Logik ---
      if (usernameStatus !== 'available') {
         toast({ title: 'Registrierung fehlgeschlagen', description: usernameError || 'Bitte wählen Sie einen gültigen Benutzernamen.', variant: 'destructive'});
         setIsLoading(false);
         return;
      }
      if (password !== confirmPassword) {
        toast({ title: 'Registrierung fehlgeschlagen', description: 'Die Passwörter stimmen nicht überein.', variant: 'destructive'});
        setIsLoading(false);
        return;
      }
      if (!termsAgreed) {
        toast({ title: 'Registrierung fehlgeschlagen', description: 'Bitte stimmen Sie den Nutzungsbedingungen zu.', variant: 'destructive'});
        setIsLoading(false);
        return;
      }

      try {
        await register(username, email, password, 'fan');
        toast({
          title: 'Registrierung erfolgreich!',
          description: 'Bitte überprüfen Sie Ihre E-Mails und geben Sie den Code ein.',
        });
        setStep('verify');
      } catch (error: any) {
         let description = 'Ein unbekannter Fehler ist aufgetreten.';

         // --- KORREKTUR 1: Fehlererkennung für doppelten Username ---
         // Fängt den DB-Trigger-Fehler (500) oder einen E-Mail-Fehler (400) ab
         if (error.message?.includes('Database error saving new user') || error.message?.includes('duplicate key value violates unique constraint "users_username_key"')) {
             description = 'Dieser Benutzername ist bereits vergeben. (Aktualisiert)';
             // Setzt die UI zurück, um den Fehler anzuzeigen
             setUsernameStatus('taken');
             setUsernameError('Benutzername ist bereits vergeben.');
         } else if (error.message?.includes('User already registered')) {
            description = 'Diese E-Mail-Adresse ist bereits registriert.';
         }
         // --- ENDE KORREKTUR 1 ---

         toast({
          title: 'Registrierung fehlgeschlagen',
          description: description,
          variant: 'destructive',
        });
      }
    }
    setIsLoading(false);
  };

  /**
   * (AKTUALISIERT) Fügt eine Verzögerung hinzu, um das "sofortige Verlassen" zu verhindern.
   */
  const handleVerificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!verificationCode || verificationCode.length < 6) {
           toast({ title: 'Fehler', description: 'Bitte geben Sie einen 6-stelligen Code ein.', variant: 'destructive'});
           return;
      }

      setIsLoading(true);
      try {
          // 1. OTP bei Supabase verifizieren
          await verifyOtp(email, verificationCode);

          toast({
              title: 'E-Mail verifiziert!',
              description: 'Ihr Konto ist jetzt aktiv. Sie werden angemeldet...',
          });

          // --- KORREKTUR 2: Login & Verzögerung ---
          // 2. Melden Sie den Benutzer explizit an, um die Sitzung zu starten
          await login(email, password);

          // 3. Warten Sie, damit der Benutzer den Toast lesen kann.
          // Der authStore-Listener wird durch das login() ausgelöst,
          // ABER onComplete() (was das Onboarding beendet) wird verzögert.
          setTimeout(() => {
            onComplete();
          }, 2000); // 2 Sekunden Verzögerung
          // --- ENDE KORREKTUR 2 ---

      } catch (error: any) {
          console.error("Verification error:", error);
          toast({
              title: 'Verifizierung fehlgeschlagen',
              description: 'Der eingegebene Code ist ungültig oder abgelaufen.',
              variant: 'destructive',
          });
          setIsLoading(false); // Nur im Fehlerfall Loading stoppen
      }
      // setIsLoading(false) wird bei Erfolg entfernt, da die Komponente unmountet
  };

  const handleResendCode = async () => {
      if (isResending) return;

      setIsResending(true);
      try {
          await resendOtp(email);
          toast({
              title: 'Code erneut gesendet',
              description: 'Bitte überprüfen Sie Ihr Postfach (und Spam-Ordner).'
          });
          setTimeout(() => setIsResending(false), 60000); // 60s Cooldown
      } catch (error: any) {
          toast({ title: 'Fehler', description: 'Code konnte nicht erneut gesendet werden.', variant: 'destructive' });
          setIsResending(false);
      }
  };

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
        {step === 'auth' ? (
          <>
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
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">Benutzername</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="ihr_benutzername"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={cn(
                        "pl-10 bg-background text-foreground border-border",
                        usernameStatus === 'taken' && "border-destructive focus-visible:ring-destructive",
                        usernameStatus === 'available' && "border-success focus-visible:ring-success"
                      )}
                      required={!isLogin}
                      aria-invalid={usernameStatus === 'taken'}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5">
                      {usernameStatus === 'checking' && <Loader2Icon className="animate-spin text-muted-foreground" />}
                      {usernameStatus === 'available' && <CheckIcon className="text-success" />}
                      {usernameStatus === 'taken' && <XIcon className="text-destructive" />}
                    </div>
                  </div>
                  {usernameError && (
                    <p className="text-xs text-destructive">{usernameError}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">E-Mail</Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="ihre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-background text-foreground border-border" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Passwort</Label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-background text-foreground border-border" required />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Passwort bestätigen</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 bg-background text-foreground border-border" required={!isLogin} />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="age" checked={ageVerified} onCheckedChange={(checked) => setAgeVerified(checked as boolean)} />
                <Label htmlFor="age" className="text-sm text-foreground cursor-pointer">Ich bestätige, dass ich über 18 Jahre alt bin</Label>
              </div>

              {!isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={termsAgreed} onCheckedChange={(checked) => setTermsAgreed(checked as boolean)} />
                  <Label htmlFor="terms" className="text-sm text-foreground cursor-pointer">Ich stimme den <a href="/terms" target="_blank" className="text-secondary hover:underline">Nutzungsbedingungen</a> zu</Label>
                </div>
              )}

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal" disabled={isLoading}>
                {isLoading ? <Loader2Icon className="w-5 h-5 animate-spin" /> : (isLogin ? 'Anmelden' : 'Registrieren')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder fortfahren mit</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral"><ChromeIcon className="mr-2 w-5 h-5" />Google</Button>
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral"><AppleIcon className="mr-2 w-5 h-5" />Apple</Button>
            </div>

            <div className="text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-secondary hover:text-secondary/80 transition-colors">
                {isLogin ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-foreground">
                E-Mail bestätigen
              </h2>
              <p className="text-muted-foreground text-sm">
                Wir haben einen 6-stelligen Code an {email} gesendet. Bitte geben Sie ihn unten ein.
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
                      type="text"
                      placeholder="XXXXXX"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10 bg-background text-foreground border-border tracking-[0.3em] text-center"
                      maxLength={6}
                      required
                   />
                </div>
              </div>

               <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal" disabled={isLoading}>
                 {isLoading ? <Loader2Icon className="w-5 h-5 animate-spin" /> : 'Bestätigen'}
               </Button>
            </form>

            <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-secondary hover:text-secondary/80 transition-colors disabled:opacity-50"
                  disabled={isResending}
                >
                    {isResending ? 'Code gesendet (bitte 60s warten)' : 'Code erneut senden'}
                </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}