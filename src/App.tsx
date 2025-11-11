// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { useAppStore } from './stores/appStore';
import { useSubscriptionStore } from './stores/subscriptionStore';
// --- NEUER IMPORT ---
import { useNotificationStore } from './stores/notificationStore';
// --- ENDE ---
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
import PostPage from './components/fan/PostPage'; // <-- NEUER IMPORT FÜR POST-SEITE

function App() {
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore(); // <-- user holen
  const { hasCompletedOnboarding } = useAppStore();
  const { loadSubscriptions, clearSubscriptions } = useSubscriptionStore();
  // --- NEUER STORE ---
  const { startPolling, stopPolling } = useNotificationStore.getState();
  // --- ENDE ---

  useEffect(() => {
    console.log("[App.tsx] useEffect RUNS. Calling initialize().");
    const unsubscribeAuth = initialize();

    return () => {
      console.log("[App.tsx] Cleanup RUNS. Unsubscribing auth listener.");
      unsubscribeAuth();
    };
  }, [initialize]);

  // Effekt für Abos UND Benachrichtigungen
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("[App.tsx] User authenticated, loading subscriptions and starting notification polling.");
      loadSubscriptions();
      startPolling(user.id); // <-- START POLLING
    } else {
      console.log("[App.tsx] User logged out, clearing subscriptions and stopping notification polling.");
      clearSubscriptions();
      stopPolling(); // <-- STOP POLLING
    }
  }, [isAuthenticated, user, loadSubscriptions, clearSubscriptions, startPolling, stopPolling]);
  // --- ENDE ---


  // --- Ladezustand anzeigen ---
  if (isLoading) {
    console.log("[App.tsx] Rendering: isLoading=true");
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <p className="text-foreground">Laden...</p>
      </div>
    );
  }

  // --- Logik für Onboarding-Anzeige ---
  const showOnboarding = !isAuthenticated || !hasCompletedOnboarding;

  console.log(`[App.tsx] Rendering: isLoading=false, isAuthenticated=${isAuthenticated}, hasCompletedOnboarding=${hasCompletedOnboarding}, showOnboarding=${showOnboarding}`);

  if (showOnboarding) {
    return (
      <>
        <OnboardingFlow />
        <Toaster />
      </>
    );
  }

  // --- Haupt-App ---
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
          {/* --- NEUE ROUTE HINZUGEFÜGT --- */}
          <Route path="/post/:postId" element={<PostPage />} />
        </Routes>
      </AppShell>
      <Toaster />
    </Router>
  );
}

export default App;