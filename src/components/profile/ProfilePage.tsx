import { useState } from 'react';
import FanProfile from './FanProfile';
import CreatorProfile from './CreatorProfile';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { LogOutIcon, Loader2Icon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
  const { currentRole, switchRole } = useAppStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, logout, updateProfile, initialize } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const handleRoleSwitchClick = () => {
    if (currentRole === 'creator') {
      switchRole('fan');
      navigate('/discover');
      return;
    }
    if (currentRole === 'fan') {
      if (user?.role?.toUpperCase() === 'CREATOR') {
        switchRole('creator');
        navigate('/dashboard');
      } else {
        setIsModalOpen(true);
      }
    }
  };

  const handleBecomeCreator = async () => {
    setIsUpdatingRole(true);
    try {
      await updateProfile({ role: 'CREATOR' });
      const { error } = await supabase.functions.invoke('create-mux-stream');

      if (error) {
        throw new Error('Fehler beim Erstellen des Live-Stream-Kanals: ' + error.message);
      }

      toast({
        title: "Willkommen, Creator!",
        description: "Dein Konto wurde umgestellt und dein Live-Stream ist bereit.",
      });

      initialize();
      switchRole('creator');
      navigate('/dashboard');
      setIsModalOpen(false);

    } catch (error: any) {
      console.error("Fehler beim Upgrade zur Creator-Rolle:", error);
      toast({
        title: "Fehler beim Upgrade",
        description: error.message || "Die Rolle konnte nicht geändert werden.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed in ProfilePage:", error);
    }
  };

  return (
    <>
      {/* ÄNDERUNG: min-h-screen entfernt, da Parent bereits scrollt */}
      <div className="w-full">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-serif text-foreground">
              {currentRole === 'creator' ? 'Creator-Einstellungen' : 'Mein Profil'}
            </h1>
            <Button
              onClick={handleRoleSwitchClick}
              variant="outline"
              className="bg-background text-foreground border-border hover:bg-neutral font-normal"
            >
              {currentRole === 'creator' ? 'Zu Fan-Modus wechseln' : 'Zu Creator-Modus wechseln'}
            </Button>
          </div>

          {currentRole === 'creator' ? <CreatorProfile /> : <FanProfile />}

          <Card className="bg-card border-border mt-8">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-foreground font-medium">Konto abmelden</h3>
                <p className="text-sm text-muted-foreground">Sie werden zum Anmeldebildschirm weitergeleitet.</p>
              </div>
              <Button
                variant="destructive"
                className="font-normal"
                onClick={handleLogout}
              >
                <LogOutIcon className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Abmelden
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Zum Creator werden?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Möchten Sie Ihr Konto zu einem Creator-Konto aufwerten? Sie erhalten
              Zugriff auf das Dashboard, den Content Vault und die Monetarisierungs-
              funktionen. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-background text-foreground border-border hover:bg-neutral"
              disabled={isUpdatingRole}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={handleBecomeCreator}
              disabled={isUpdatingRole}
            >
              {isUpdatingRole ? (
                <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                'Ja, zum Creator werden'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}