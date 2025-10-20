import FanProfile from './FanProfile';
import CreatorProfile from './CreatorProfile';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { currentRole, switchRole } = useAppStore();
  const navigate = useNavigate();

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
      </div>
    </div>
  );
}
