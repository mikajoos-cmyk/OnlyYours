import { useState } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, ChromeIcon, AppleIcon } from 'lucide-react';
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
  const { login } = useAuthStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageVerified) {
      toast({
        title: 'Altersverifizierung erforderlich',
        description: 'Bitte bestätigen Sie, dass Sie über 18 Jahre alt sind.',
        variant: 'destructive',
      });
      return;
    }
    await login(email, password);
    onComplete();
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              E-MailIcon
            </Label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ihre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Passwort
            </Label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-background text-foreground border-border"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="age"
              checked={ageVerified}
              onCheckedChange={(checked) => setAgeVerified(checked as boolean)}
            />
            <Label
              htmlFor="age"
              className="text-sm text-foreground cursor-pointer"
            >
              Ich bestätige, dass ich über 18 Jahre alt bin
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 font-normal"
          >
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Oder fortfahren mit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="bg-background text-foreground border-border hover:bg-neutral"
          >
            <ChromeIcon className="mr-2 w-5 h-5" />
            Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-background text-foreground border-border hover:bg-neutral"
          >
            <AppleIcon className="mr-2 w-5 h-5" />
            AppleIcon
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-secondary hover:text-secondary/80 transition-colors"
          >
            {isLogin
              ? 'Noch kein Konto? Registrieren'
              : 'Bereits registriert? Anmelden'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
