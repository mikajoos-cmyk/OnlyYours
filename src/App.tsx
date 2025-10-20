import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useAppStore } from './stores/appStore';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import AppShell from './components/layout/AppShell';
import DiscoveryFeed from './components/fan/DiscoveryFeed';
import CreatorProfile from './components/fan/CreatorProfile';
import SubscriberFeed from './components/fan/SubscriberFeed';
import SearchPage from './components/fan/SearchPage';
import Dashboard from './components/creator/Dashboard';
import ContentVault from './components/creator/ContentVault';
import PostEditor from './components/creator/PostEditor';
import Messages from './components/creator/Messages';
import Statistics from './components/creator/Statistics';
import Payouts from './components/creator/Payouts';
import ProfilePage from './components/profile/ProfilePage';
import { Toaster } from './components/ui/toaster';


function App() {
  const { isAuthenticated, initialize } = useAuthStore();
  const { hasCompletedOnboarding } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isAuthenticated || !hasCompletedOnboarding) {
    return (
      <>
        <OnboardingFlow />
        <Toaster />
      </>
    );
  }

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoveryFeed />} />
          <Route path="/creator/:id" element={<CreatorProfile />} />
          <Route path="/feed" element={<SubscriberFeed />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<ContentVault />} />
          <Route path="/post/new" element={<PostEditor />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/payouts" element={<Payouts />} />
        </Routes>
      </AppShell>
      <Toaster />
    </Router>
  );
}

export default App;
