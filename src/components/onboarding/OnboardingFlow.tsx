import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeSplash from './WelcomeSplash';
import AuthModal from './AuthModal';
import { useAppStore } from '../../stores/appStore';

export default function OnboardingFlow() {
  const [showSplash, setShowSplash] = useState(true);
  const { completeOnboarding } = useAppStore();

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleAuthComplete = () => {
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-gradient-1">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <WelcomeSplash key="splash" onComplete={handleSplashComplete} />
        ) : (
          <AuthModal key="auth" onComplete={handleAuthComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}
