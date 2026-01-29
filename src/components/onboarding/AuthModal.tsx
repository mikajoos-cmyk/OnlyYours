import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MailIcon,
  LockIcon,
  ChromeIcon,
  UserIcon,
  Loader2Icon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

// Vollständige Länderliste
const ALL_COUNTRIES = [
  "Deutschland", "Österreich", "Schweiz", "Afghanistan", "Ägypten", "Albanien", "Algerien", "Andorra", "Angola", "Antigua und Barbuda",
  "Äquatorialguinea", "Argentinien", "Armenien", "Aserbaidschan", "Äthiopien", "Australien", "Bahamas", "Bahrain", "Bangladesch",
  "Barbados", "Belgien", "Belize", "Benin", "Bhutan", "Bolivien", "Bosnien und Herzegowina", "Botswana", "Brasilien", "Brunei",
  "Bulgarien", "Burkina Faso", "Burundi", "Chile", "China", "Costa Rica", "Dänemark", "Dominica", "Dominikanische Republik",
  "Dschibuti", "Ecuador", "El Salvador", "Elfenbeinküste", "Eritrea", "Estland", "Eswatini", "Fidschi", "Finnland", "Frankreich",
  "Gabun", "Gambia", "Georgien", "Ghana", "Grenada", "Griechenland", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Indien", "Indonesien", "Irak", "Iran", "Irland", "Island", "Israel", "Italien", "Jamaika", "Japan", "Jemen",
  "Jordanien", "Kambodscha", "Kamerun", "Kanada", "Kap Verde", "Kasachstan", "Katar", "Kenia", "Kirgisistan", "Kiribati", "Kolumbien",
  "Komoren", "Kongo (Dem. Rep.)", "Kongo (Rep.)", "Kroatien", "Kuba", "Kuwait", "Laos", "Lesotho", "Lettland", "Libanon", "Liberia",
  "Libyen", "Liechtenstein", "Litauen", "Luxemburg", "Madagaskar", "Malawi", "Malaysia", "Malediven", "Mali", "Malta", "Marokko",
  "Marshallinseln", "Mauretanien", "Mauritius", "Mexiko", "Mikronesien", "Moldawien", "Monaco", "Mongolei", "Montenegro", "Mosambik",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Neuseeland", "Nicaragua", "Niederlande", "Niger", "Nigeria", "Nordkorea", "Nordmazedonien",
  "Norwegen", "Oman", "Pakistan", "Palau", "Panama", "Papua-Neuguinea", "Paraguay", "Peru", "Philippinen", "Polen", "Portugal",
  "Ruanda", "Rumänien", "Russland", "Salomonen", "Sambia", "Samoa", "San Marino", "São Tomé und Príncipe", "Saudi-Arabien",
  "Schweden", "Senegal", "Serbien", "Seychellen", "Sierra Leone", "Simbabwe", "Singapur", "Slowakei", "Slowenien", "Somalia",
  "Spanien", "Sri Lanka", "St. Kitts und Nevis", "St. Lucia", "St. Vincent und die Grenadinen", "Südafrika", "Sudan", "Südkorea",
  "Südsudan", "Suriname", "Syrien", "Tadschikistan", "Tansania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad und Tobago",
  "Tschad", "Tschechien", "Tunesien", "Türkei", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "Ungarn", "Uruguay", "USA", "Usbekistan",
  "Vanuatu", "Vatikanstadt", "Venezuela", "Vereinigte Arabische Emirate", "Vereinigtes Königreich", "Vietnam", "Weißrussland",
  "Zentralafrikanische Republik", "Zypern"
].sort();

interface AuthModalProps {
  onComplete: () => void;
}

type ValidationStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function AuthModal({ onComplete }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'auth' | 'verify' | 'forgot'>('auth');

  const { login, register, verifyOtp, checkUsernameAvailability, checkEmailAvailability } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<ValidationStatus>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  const debounceUsernameTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceEmailTimer = useRef<NodeJS.Timeout | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Username Validierung
  useEffect(() => {
    if (isLogin || !username) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    // 1. Berechnung des "echten" Usernames (wie er im Backend ankommt)
    // Entfernt Leerzeichen und Sonderzeichen
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // 2. Prüfung auf Länge DES BEREINIGTEN NAMENS
    if (cleanUsername.length < 3) {
      setUsernameStatus('taken');
      // Differenzierte Fehlermeldung
      if (username.length >= 3) {
        setUsernameError('Ungültige Zeichen (nur a-z, 0-9, _)');
      } else {
        setUsernameError('Mindestens 3 Zeichen');
      }
      return;
    }

    // 3. Verfügbarkeitsprüfung (Debounced)
    setUsernameStatus('checking');
    setUsernameError(null);

    if (debounceUsernameTimer.current) clearTimeout(debounceUsernameTimer.current);
    debounceUsernameTimer.current = setTimeout(async () => {
      const available = await checkUsernameAvailability(cleanUsername); // Prüfe den Clean-Namen!
      if (available) {
        setUsernameStatus('available');
        setUsernameError(null);
      } else {
        setUsernameStatus('taken');
        setUsernameError('Benutzername bereits vergeben');
      }
    }, 500);
  }, [username, isLogin, checkUsernameAvailability]);

  // Email Validierung
  useEffect(() => {
    if (isLogin || !email) {
      setEmailStatus('idle');
      setEmailError(null);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');
    setEmailError(null);

    if (debounceEmailTimer.current) clearTimeout(debounceEmailTimer.current);
    debounceEmailTimer.current = setTimeout(async () => {
      const available = await checkEmailAvailability(email);
      if (available) {
        setEmailStatus('available');
        setEmailError(null);
      } else {
        setEmailStatus('taken');
        setEmailError('E-Mail bereits registriert');
      }
    }, 500);
  }, [email, isLogin, checkEmailAvailability]);


  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isLogin) {
      if (!birthdate) {
        toast({ title: 'Fehler', description: 'Bitte geben Sie Ihr Geburtsdatum an.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const birthDateObj = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDateObj.getFullYear();
      const m = today.getMonth() - birthDateObj.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
      }
      if (age < 18) {
        toast({ title: 'Altersbeschränkung', description: 'Sie müssen mindestens 18 Jahre alt sein.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }

    if (isLogin) {
      try {
        await login(email, password);
        onComplete();
      } catch (error: any) {
        toast({ title: 'Anmeldung fehlgeschlagen', description: error.message, variant: 'destructive' });
      }
    } else {
      if (usernameStatus !== 'available') {
        toast({ title: 'Benutzername ungültig', description: usernameError || 'Bitte prüfen', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (emailStatus !== 'available') {
        toast({ title: 'E-Mail ungültig', description: emailError || 'Bitte prüfen', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: 'Passwort', description: 'Passwörter stimmen nicht überein.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (!termsAgreed || !country) {
        toast({ title: 'Fehlende Angaben', description: 'Bitte AGB und Land prüfen.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      try {
        await register(username, email, password, country, birthdate, 'fan');
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
    setIsLoading(true);
    try {
      await verifyOtp(email, verificationCode);
      toast({ title: "Verifiziert", description: "Willkommen!" });
      await login(email, password);
      onComplete();
    } catch (err: any) {
      toast({ title: "Fehler", description: "Ungültiger Code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center min-h-screen px-4 py-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md bg-card rounded-lg p-8 space-y-6 border border-border max-h-[85vh] overflow-y-auto chat-messages-scrollbar"
      >

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
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      maxLength={30} // Maximale Länge direkt im Input limitieren
                      className={cn(
                        "pl-10 pr-10 bg-background border-border",
                        usernameError ? 'border-destructive focus-visible:ring-destructive' : '',
                        usernameStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : ''
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {usernameStatus === 'checking' && <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {usernameStatus === 'available' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                      {usernameStatus === 'taken' && <XCircleIcon className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                  {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label>E-Mail</Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={cn(
                      "pl-10 pr-10 bg-background border-border",
                      emailError ? 'border-destructive focus-visible:ring-destructive' : '',
                      !isLogin && emailStatus === 'available' ? 'border-green-500 focus-visible:ring-green-500' : ''
                    )}
                  />
                  {!isLogin && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {emailStatus === 'checking' && <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {emailStatus === 'available' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                      {emailStatus === 'taken' && <XCircleIcon className="w-4 h-4 text-destructive" />}
                    </div>
                  )}
                </div>
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Passwort</Label>
                  {isLogin && <span className="text-xs text-secondary cursor-pointer hover:underline" onClick={() => setStep('forgot')}>Vergessen?</span>}
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-background border-border" />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Land</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Land auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border-border max-h-60">
                        {ALL_COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Geburtsdatum</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="date"
                        value={birthdate}
                        onChange={e => setBirthdate(e.target.value)}
                        className="pl-10 bg-background border-border"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Passwort bestätigen</Label>
                    <div className="relative"><LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 bg-background border-border" /></div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" checked={termsAgreed} onCheckedChange={(c) => setTermsAgreed(c as boolean)} className="mt-1" />
                    <Label htmlFor="terms" className="text-sm leading-normal cursor-pointer">
                      Ich stimme den <a href="/agb" target="_blank" className="text-secondary hover:underline">AGB</a>, dem <a href="/creator-vertrag" target="_blank" className="text-secondary hover:underline">Creator-Vertrag</a> und der <a href="/datenschutz" target="_blank" className="text-secondary hover:underline">Datenschutzerklärung</a> zu. Ich bestätige, dass ich über 18 Jahre alt bin.
                    </Label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin" /> : (isLogin ? 'Anmelden' : 'Registrieren')}</Button>
            </form>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Oder fortfahren mit</span></div></div>

            <div className="grid grid-cols-1 gap-4">
              <Button type="button" variant="outline" className="bg-background text-foreground border-border hover:bg-neutral py-6" disabled>
                <ChromeIcon className="mr-2 w-5 h-5" />
                Mit Google fortfahren (Wartung)
              </Button>
            </div>

            <div className="text-center"><button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-secondary hover:underline">{isLogin ? 'Registrieren' : 'Anmelden'}</button></div>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="flex items-center mb-4">
              <button onClick={() => setStep('auth')} className="text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="w-5 h-5" /></button>
              <h2 className="text-2xl font-serif ml-4">E-Mail verifizieren</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Ein Code wurde an {email} gesendet.</p>
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Verifizierungscode</Label>
                <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" className="text-center tracking-widest text-xl bg-background border-border" />
              </div>
              <Button type="submit" className="w-full bg-secondary text-secondary-foreground" disabled={isLoading}>{isLoading ? <Loader2Icon className="animate-spin" /> : "Verifizieren"}</Button>
            </form>
          </>
        )}

        {step === 'forgot' && (
          <>
            <div className="flex items-center mb-4">
              <button onClick={() => setStep('auth')} className="text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="w-5 h-5" /></button>
              <h2 className="text-2xl font-serif ml-4">Passwort vergessen?</h2>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              Funktion wird gewartet. Bitte Support kontaktieren.
            </div>
          </>
        )}

      </motion.div>
    </motion.div>
  );
}