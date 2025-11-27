// src/components/onboarding/AuthModal.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, ChromeIcon, AppleIcon, UserIcon, KeyRoundIcon, Loader2Icon, CheckIcon, XIcon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase'; // Zugriff für Reset

interface AuthModalProps {
  onComplete: () => void;
}

type ValidationStatus = 'idle' | 'checking' | 'available' | 'taken';

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function AuthModal({ onComplete }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'auth' | 'verify' | 'forgot'>('auth');

  const { login, register, verifyOtp, resendOtp, checkUsernameAvailability, checkEmailAvailability } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<ValidationStatus>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  const debounceUsernameTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceEmailTimer = useRef<NodeJS.Timeout | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Username Check (bleibt gleich)
  useEffect(() => {
    if (isLogin || !username) { setUsernameStatus('idle'); setUsernameError(null); return; }
    if (debounceUsernameTimer.current) clearTimeout(debounceUsernameTimer.current);
    if (username.length < 3) { setUsernameStatus('taken'); setUsernameError('Min. 3 Zeichen'); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { setUsernameStatus('taken'); setUsernameError('Nur Kleinbuchstaben, Zahlen und _'); return; }
    setUsernameError(null); setUsernameStatus('checking');
    debounceUsernameTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        if(isAvailable) { setUsernameStatus('available'); setUsernameError(null); }
        else { setUsernameStatus('taken'); setUsernameError('Vergeben'); }
      } catch (e) { setUsernameStatus('taken'); setUsernameError('Fehler'); }
    }, 500);
    return () => { if (debounceUsernameTimer.current) clearTimeout(debounceUsernameTimer.current); };
  }, [username, isLogin, checkUsernameAvailability]);

  // Email Check (bleibt gleich)
  useEffect(() => {
    if (isLogin || !email) { setEmailStatus('idle'); setEmailError(null); return; }
    if (debounceEmailTimer.current) clearTimeout(debounceEmailTimer.current);
    if (!validateEmail(email)) { setEmailStatus('idle'); setEmailError('Ungültig'); return; }
    setEmailError(null); setEmailStatus('checking');
    debounceEmailTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkEmailAvailability(email);
        if(isAvailable) { setEmailStatus('available'); setEmailError(null); }
        else { setEmailStatus('taken'); setEmailError('Bereits registriert'); }
      } catch (e) { setEmailStatus('taken'); setEmailError('Fehler'); }
    }, 500);
    return () => { if (debounceEmailTimer.current) clearTimeout(debounceEmailTimer.current); };
  }, [email, isLogin, checkEmailAvailability]);


  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!ageVerified && !isLogin) {
        toast({ title: 'Altersverifizierung erforderlich', description: 'Bitte bestätigen Sie Ihr Alter.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    if (isLogin) {
      try {
        await login(email, password);
      } catch (error: any) {
        toast({ title: 'Anmeldung fehlgeschlagen', description: error.message, variant: 'destructive' });
      }
    } else {
        if (usernameStatus !== 'available' || emailStatus !== 'available' || password !== confirmPassword || !termsAgreed) {
            toast({ title: 'Prüfen Sie Ihre Eingaben', variant: 'destructive'});
            setIsLoading(false);
            return;
        }
        try {
            await register(username, email, password, 'fan');
            toast({ title: 'Code gesendet', description: 'Bitte E-Mails prüfen.' });
            setStep('verify');
        } catch (e: any) {
            toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
        }
    }
    setIsLoading(false);
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!verificationCode) return;
      setIsLoading(true);
      try {
          await verifyOtp(email, verificationCode);
          toast({ title: 'Erfolg!', description: 'Angemeldet.' });
          await login(email, password);
          onComplete();
      } catch (e: any) {
          toast({ title: 'Fehler', description: 'Ungültiger Code.', variant: 'destructive' });
      } finally {
          setIsLoading(false);
      }
  };

  // --- NEU: Passwort Reset Handler ---
  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !validateEmail(email)) {
          toast({ title: "Fehler", description: "Bitte gültige E-Mail eingeben.", variant: "destructive" });
          return;
      }
      setIsLoading(true);
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin + '/profile?reset=true',
          });
          if (error) throw error;
          toast({ title: "E-Mail gesendet", description: "Prüfen Sie Ihr Postfach für den Reset-Link." });
          setStep('auth');
      } catch (e: any) {
          toast({ title: "Fehler", description: e.message, variant: "destructive" });
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center min-h-screen px-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-full max-w-md bg-card rounded-lg p-8 space-y-6">

        {step === 'auth' && (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-foreground">{isLogin ? 'Willkommen zurück' : 'Konto erstellen'}</h2>
              <p className="text-muted-foreground text-sm">{isLogin ? 'Melden Sie sich an' : 'Erstellen Sie Ihr Konto'}</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                  <div className="space-y-2">
                    <Label>Benutzername</Label>
                    <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input value={username} onChange={e => setUsername(e.target.value)} className="pl-10 bg-background border-border"/></div>
                    {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                  </div>
              )}

              <div className="space-y-2">
                <Label>E-Mail</Label>
                <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background border-border"/></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                    <Label>Passwort</Label>
                    {isLogin && <span className="text-xs text-secondary cursor-pointer hover:underline" onClick={() => setStep('forgot')}>Vergessen?</span>}
                </div>
                <div className="relative"><LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-background border-border"/></div>
              </div>

              {!isLogin && (
                  <>
                    <div className="space-y-2"><Label>Bestätigen</Label><div className="relative"><LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 bg-background border-border"/></div></div>
                    <div className="flex items-center space-x-2 pt-2"><Checkbox id="age" checked={ageVerified} onCheckedChange={(c) => setAgeVerified(c as boolean)} /><Label htmlFor="age">Über 18 Jahre alt</Label></div>
                    <div className="flex items-center space-x-2"><Checkbox id="terms" checked={termsAgreed} onCheckedChange={(c) => setTermsAgreed(c as boolean)} /><Label htmlFor="terms">AGB & Datenschutz zustimmen</Label></div>
                  </>
              )}

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin"/> : (isLogin ? 'Anmelden' : 'Registrieren')}</Button>
            </form>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"/></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder</span></div></div>
            <div className="grid grid-cols-2 gap-4"><Button variant="outline"><ChromeIcon className="mr-2 w-5 h-5"/>Google</Button><Button variant="outline"><AppleIcon className="mr-2 w-5 h-5"/>Apple</Button></div>
            <div className="text-center"><button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-secondary hover:underline">{isLogin ? 'Registrieren' : 'Anmelden'}</button></div>
          </>
        )}

        {step === 'verify' && (
            <>
             <div className="text-center space-y-2"><h2 className="text-3xl font-serif">Code eingeben</h2><p className="text-muted-foreground text-sm">Code an {email} gesendet.</p></div>
             <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="relative"><KeyRoundIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="pl-10 bg-background border-border tracking-[0.5em] text-center" maxLength={6}/></div>
                <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin"/> : 'Bestätigen'}</Button>
             </form>
            </>
        )}

        {/* FORGOT PASSWORD STEP */}
        {step === 'forgot' && (
            <>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-serif text-foreground">Passwort zurücksetzen</h2>
                    <p className="text-muted-foreground text-sm">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                        <Label>E-Mail</Label>
                        <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"/><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background border-border"/></div>
                    </div>
                    <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin"/> : 'Link senden'}</Button>
                </form>
                <div className="text-center">
                    <button type="button" onClick={() => setStep('auth')} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto">
                        <ArrowLeftIcon className="w-3 h-3"/> Zurück zum Login
                    </button>
                </div>
            </>
        )}

      </motion.div>
    </motion.div>
  );
}