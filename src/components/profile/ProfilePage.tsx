// src/components/profile/ProfilePage.tsx
import FanProfile from './FanProfile';
import CreatorProfile from './CreatorProfile';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
// --- NEUE IMPORTS ---
import { useAuthStore } from '../../stores/authStore';
import { LogOutIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card'; // Card importieren
// --- ENDE NEUE IMPORTS ---

export default function ProfilePage() {
  const { currentRole, switchRole } = useAppStore();
  const navigate = useNavigate();
  // --- NEU: Logout-Funktion holen ---
  const { logout } = useAuthStore();

  const handleRoleSwitch = () => {
    const newRole = currentRole === 'creator' ? 'fan' : 'creator';
    switchRole(newRole);
    
    // Navigate to the appropriate home screen after switching
    if (newRole === 'creator') {
      navigate('/dashboard');
    } else {
      navigate('/discover');
    }
  };

  // --- NEU: Logout-Handler (identisch zur TopBar-Korrektur) ---
  const handleLogout = async () => {
    try {
      await logout();
      window.location.reload(); // Neu laden, um zur Onboarding/Login-Seite zu gelangen
    } catch (error) {
      console.error("Logout failed in ProfilePage:", error);
    }
  };
  // --- ENDE NEU ---

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-serif text-foreground">
            {currentRole === 'creator' ? 'Creator-Einstellungen' : 'Mein Profil'}
          </h1>
          <Button
            onClick={handleRoleSwitch}
            variant="outline"
            className="bg-background text-foreground border-border hover:bg-neutral font-normal"
          >
            {currentRole === 'creator' ? 'Zu Fan-Modus wechseln' : 'Zu Creator-Modus wechseln'}
          </Button>
        </div>
        
        {currentRole === 'creator' ? <CreatorProfile /> : <FanProfile />}

        {/* --- NEUER ABMELDE-BEREICH --- */}
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
        {/* --- ENDE NEUER BEREICH --- */}

      </div>
    </div>
  );
}