import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, ChromeIcon, UserIcon, KeyRoundIcon, Loader2Icon, ArrowLeftIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

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

  const { login, register, loginWithOAuth, verifyOtp, checkUsernameAvailability, checkEmailAvailability } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<ValidationStatus>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  const debounceUsernameTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceEmailTimer = useRef<NodeJS.Timeout | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLogin || !username) { setUsernameStatus('idle'); setUsernameError(null); return; }
    if (debounceUsernameTimer.current) clearTimeout(debounceUsernameTimer.current);
    if (username.length < 3) { setUsernameStatus('taken'); setUsernameError('Min. 3 Zeichen'); return; }
    if (!/^[a-z0-9_]+$/.test(username)) { setUsernameStatus('taken'); setUsernameError('Nur Kleinbuchstaben, Zahlen und _'); return; }
    setUsernameError(null); setUsernameStatus('checking');
    debounceUsernameTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) { setUsernameStatus('available'); setUsernameError(null); }
        else { setUsernameStatus('taken'); setUsernameError('Vergeben'); }
      } catch (e) { setUsernameStatus('taken'); setUsernameError('Fehler'); }
    }, 500);
    return () => { if (debounceUsernameTimer.current) clearTimeout(debounceUsernameTimer.current); };
  }, [username, isLogin, checkUsernameAvailability]);

  useEffect(() => {
    if (isLogin || !email) { setEmailStatus('idle'); setEmailError(null); return; }
    if (debounceEmailTimer.current) clearTimeout(debounceEmailTimer.current);
    if (!validateEmail(email)) { setEmailStatus('idle'); setEmailError('Ungültig'); return; }
    setEmailError(null); setEmailStatus('checking');
    debounceEmailTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkEmailAvailability(email);
        if (isAvailable) { setEmailStatus('available'); setEmailError(null); }
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
      if (usernameStatus !== 'available' || emailStatus !== 'available' || password !== confirmPassword || !termsAgreed || !country) {
        toast({ title: 'Prüfen Sie Ihre Eingaben', description: !country ? 'Bitte Land auswählen' : undefined, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      try {
        await register(username, email, password, country, 'fan');
        toast({ title: 'Code gesendet', description: 'Bitte E-Mails prüfen.' });
        setStep('verify');
      } catch (e: any) {
        toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
      }
    }
    setIsLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      await loginWithOAuth(provider);
    } catch (error: any) {
      toast({ title: "Login fehlgeschlagen", description: error.message, variant: "destructive" });
      setIsLoading(false);
    }
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
                  <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input value={username} onChange={e => setUsername(e.target.value)} className="pl-10 bg-background border-border" /></div>
                  {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>E-Mail</Label>
                <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background border-border" /></div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Passwort</Label>
                  {isLogin && <span className="text-xs text-secondary cursor-pointer hover:underline" onClick={() => setStep('forgot')}>Vergessen?</span>}
                </div>
                <div className="relative"><LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-background border-border" /></div>
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Land</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Land auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border">
                        <SelectItem value="DE">Deutschland</SelectItem>
                        <SelectItem value="AT">Österreich</SelectItem>
                        <SelectItem value="CH">Schweiz</SelectItem>
                        <SelectItem value="US">USA</SelectItem>
                        <SelectItem value="GB">Großbritannien</SelectItem>
                        <SelectItem value="FR">Frankreich</SelectItem>
                        <SelectItem value="ES">Spanien</SelectItem>
                        <SelectItem value="IT">Italien</SelectItem>
                        <SelectItem value="PL">Polen</SelectItem>
                        <SelectItem value="NL">Niederlande</SelectItem>
                        <SelectItem value="BE">Belgien</SelectItem>
                        <SelectItem value="OTHER">Andere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bestätigen</Label>
                    <div className="relative"><LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 bg-background border-border" /></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="age" checked={ageVerified} onCheckedChange={(c) => setAgeVerified(c as boolean)} />
                    <Label htmlFor="age" className="text-sm cursor-pointer">Ich bestätige, dass ich über 18 Jahre alt bin.</Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" checked={termsAgreed} onCheckedChange={(c) => setTermsAgreed(c as boolean)} className="mt-1" />
                    <Label htmlFor="terms" className="text-sm leading-normal cursor-pointer">
                      Ich stimme den <a href="/impressum" target="_blank" className="text-secondary hover:underline">AGB</a> und der <a href="/datenschutz" target="_blank" className="text-secondary hover:underline">Datenschutzerklärung</a> zu.
                    </Label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin" /> : (isLogin ? 'Anmelden' : 'Registrieren')}</Button>
            </form>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder fortfahren mit</span></div></div>

            {/* --- GEÄNDERT: Nur Google Button --- */}
            <div className="grid grid-cols-1 gap-4">
              <Button type="button" variant="outline" onClick={() => handleSocialLogin('google')} className="bg-background text-foreground border-border hover:bg-neutral py-6">
                <ChromeIcon className="mr-2 w-5 h-5" />
                Mit Google fortfahren
              </Button>
            </div>
            {/* --------------------------------- */}

            <div className="text-center"><button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-secondary hover:underline">{isLogin ? 'Registrieren' : 'Anmelden'}</button></div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="text-center space-y-2"><h2 className="text-3xl font-serif">Code eingeben</h2><p className="text-muted-foreground text-sm">Code an {email} gesendet.</p></div>
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="relative"><KeyRoundIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="pl-10 bg-background border-border tracking-[0.5em] text-center" maxLength={6} /></div>
              <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin" /> : 'Bestätigen'}</Button>
            </form>
          </>
        )}

        {step === 'forgot' && (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-serif text-foreground">Passwort zurücksetzen</h2>
              <p className="text-muted-foreground text-sm">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>E-Mail</Label>
                <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 bg-background border-border" /></div>
              </div>
              <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin" /> : 'Link senden'}</Button>
            </form>
            <div className="text-center">
              <button type="button" onClick={() => setStep('auth')} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto">
                <ArrowLeftIcon className="w-3 h-3" /> Zurück zum Login
              </button>
            </div>
          </>
        )}

      </motion.div>
    </motion.div>
  );
}