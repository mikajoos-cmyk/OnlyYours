import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSplash from './WelcomeSplash';
import AuthModal from './AuthModal';
import IdentityVerification from './IdentityVerification';
import AddressStep from './AddressStep';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';

export default function OnboardingFlow() {
  const [showSplash, setShowSplash] = useState(true);
  const { completeOnboarding } = useAppStore();
  const { isAuthenticated, user, isRecoveringPassword } = useAuthStore();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleAuthComplete = () => {
    // Wenn es ein Fan ist, Onboarding direkt abschließen
    if (user?.role !== 'creator' && !isRecoveringPassword) {
      completeOnboarding();
    }
  };

  // Wenn der User eingeloggt ist und ein Creator, aber noch nicht verifiziert
  const needsVerification = isAuthenticated && user?.role === 'creator' && user?.identity_verification_status !== 'verified' && !isRecoveringPassword;

  // Wenn verifiziert aber Adresse fehlt (nur für Creator)
  const needsAddress = isAuthenticated && user?.role === 'creator' && user?.identity_verification_status === 'verified' && !user?.address_street && !isRecoveringPassword;

  // Wenn verifiziert, automatisch abschließen
  useEffect(() => {
    if (isAuthenticated && !isRecoveringPassword) {
      if (user?.role !== 'creator') {
        completeOnboarding();
      } else if (user?.identity_verification_status === 'verified') {
        completeOnboarding();
      }
    }
  }, [isAuthenticated, user, completeOnboarding, isRecoveringPassword]);

  return (
    <div className="min-h-screen bg-gradient-1 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <WelcomeSplash key="splash" onComplete={handleSplashComplete} />
        ) : (!isAuthenticated || isRecoveringPassword) ? (
          <AuthModal key="auth" onComplete={handleAuthComplete} />
        ) : needsVerification ? (
          <IdentityVerification key="verification" />
        ) : needsAddress ? (
          <AddressStep key="address" onComplete={completeOnboarding} />
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
