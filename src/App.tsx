// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useAppStore } from './stores/appStore';
import { useSubscriptionStore } from './stores/subscriptionStore';
import { useNotificationStore } from './stores/notificationStore';
import { userService } from './services/userService'; // <-- Importiert
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
import PostPage from './components/fan/PostPage';
import LiveStreamWrapper from './components/creator/LiveStreamWrapper';
import Impressum from './components/legal/Impressum';
import Datenschutz from './components/legal/Datenschutz';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  const { hasCompletedOnboarding } = useAppStore();
  const { loadSubscriptions, clearSubscriptions } = useSubscriptionStore();
  const { startPolling, stopPolling } = useNotificationStore.getState();

  useEffect(() => {
    const unsubscribeAuth = initialize();
    return () => {
      unsubscribeAuth();
    };
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSubscriptions();
      startPolling(user.id);
      
      // --- NEU: Aktivitätsstatus aktualisieren ---
      userService.updateLastSeen();
      // -------------------------------------------
      
    } else {
      clearSubscriptions();
      stopPolling();
    }
  }, [isAuthenticated, user, loadSubscriptions, clearSubscriptions, startPolling, stopPolling]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <p className="text-foreground">Laden...</p>
      </div>
    );
  }

  const showOnboarding = !isAuthenticated || !hasCompletedOnboarding;

  if (showOnboarding) {
    // Zugriff auf Rechtstexte auch ohne Login ermöglichen
    return (
      <Router>
        <Routes>
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="*" element={
            <>
              <OnboardingFlow />
              <Toaster />
            </>
          } />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoveryFeed />} />
          <Route path="/profile/:username" element={<CreatorProfile />} />
          <Route path="/feed" element={<SubscriberFeed />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vault" element={<ContentVault />} />
          <Route path="/post/new" element={<PostEditor />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/post/:postId" element={<PostPage />} />

          <Route path="/live" element={<LiveStreamWrapper />} />
          <Route path="/live/:username" element={<LiveStreamWrapper />} />

          {/* Rechtliche Routen */}
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />

          {/* Admin Route */}
          <Route path="/admin" element={<AdminDashboard />} />

          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </Router>
  );
}

export default App;