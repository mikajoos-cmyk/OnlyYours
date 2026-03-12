import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSplash from './WelcomeSplash';
import AuthModal from './AuthModal';
import IdentityVerification from './IdentityVerification';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';

export default function OnboardingFlow() {
  const [showSplash, setShowSplash] = useState(true);
  const { completeOnboarding } = useAppStore();
  const { isAuthenticated, user } = useAuthStore();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleAuthComplete = () => {
    // Wenn es ein Fan ist, Onboarding direkt abschließen
    if (user?.role !== 'creator') {
      completeOnboarding();
    }
  };

  // Wenn der User eingeloggt ist und ein Creator, aber noch nicht verifiziert
  const needsVerification = isAuthenticated && user?.role === 'creator' && user?.identity_verification_status !== 'verified';

  // Wenn verifiziert, automatisch abschließen
  useEffect(() => {
    if (isAuthenticated && user?.role === 'creator' && user?.identity_verification_status === 'verified') {
        completeOnboarding();
    }
  }, [isAuthenticated, user, completeOnboarding]);

  return (
    <div className="min-h-screen bg-gradient-1 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <WelcomeSplash key="splash" onComplete={handleSplashComplete} />
        ) : !isAuthenticated ? (
          <AuthModal key="auth" onComplete={handleAuthComplete} />
        ) : needsVerification ? (
          <IdentityVerification key="verification" onComplete={completeOnboarding} />
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white text-xl font-medium"
          >
             Lädt...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
