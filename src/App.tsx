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
import CreatorShop from './components/fan/CreatorShop';
import SubscriberFeed from './components/fan/SubscriberFeed';
import SearchPage from './components/fan/SearchPage';
import Dashboard from './components/creator/Dashboard';
import ContentVault from './components/creator/ContentVault';
import PostEditor from './components/creator/PostEditor';
import Messages from './components/creator/Messages';
import Statistics from './components/creator/Statistics';
import Payouts from './components/creator/Payouts';
import ProfilePage from './components/profile/ProfilePage';
import { AppealModal } from './components/creator/AppealModal';
import { Toaster } from './components/ui/toaster';
import CookieBanner from './components/ui/CookieBanner';
import PostPage from './components/fan/PostPage';
import AgeGate from './components/fan/AgeGate';
import LiveStreamWrapper from './components/creator/LiveStreamWrapper';
import Impressum from './components/legal/Impressum';
import Datenschutz from './components/legal/Datenschutz';
import AGB from './components/legal/AGB';
import CreatorVertrag from './components/legal/CreatorVertrag';
import AdminDashboard from './pages/AdminDashboard';
import SupportPage from './pages/SupportPage';
import CreatorAddressGate from './components/creator/CreatorAddressGate';

function App() {
  const { isAuthenticated, isLoading, initialize, user, isRecoveringPassword } = useAuthStore();
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

  if (user?.is_suspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Account gesperrt</h1>
          <p className="text-gray-600 mb-6">
            Dein Account wurde wegen eines Verstoßes gegen unsere Richtlinien gesperrt.
          </p>
          
          {user.suspension_reason && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Grund der Sperrung:</p>
              <p className="text-gray-700 italic">"{user.suspension_reason}"</p>
            </div>
          )}
          
          {/* Wir prüfen den Status des Widerspruchs */}
          {user.appeal_status === 'pending' ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
                Dein Widerspruch wird aktuell von unserem Team geprüft. Wir benachrichtigen dich per E-Mail.
              </div>
              <AppealModal userId={user.id} appealStatus="pending" />
            </div>
          ) : user.appeal_status === 'rejected' ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 text-sm">
                Dein Widerspruch wurde abgelehnt. Die Sperrung bleibt bestehen.
              </div>
              <AppealModal userId={user.id} appealStatus="rejected" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Wenn du glaubst, dass dies ein Fehler war, kannst du einmalig Widerspruch einlegen.
              </p>
              <AppealModal userId={user.id} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const showOnboarding = !isAuthenticated || !hasCompletedOnboarding || isRecoveringPassword;

  return (
    <Router>
      {showOnboarding ? (
        <Routes>
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />
          <Route path="/creator-vertrag" element={<CreatorVertrag />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="*" element={<OnboardingFlow />} />
        </Routes>
      ) : (
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="/discover" element={<AgeGate><DiscoveryFeed /></AgeGate>} />
            <Route path="/profile/:username" element={<CreatorProfile />} />
            <Route path="/shop/:username" element={<AgeGate><CreatorShop /></AgeGate>} />
            <Route path="/feed" element={<AgeGate><SubscriberFeed /></AgeGate>} />
            <Route path="/search" element={<AgeGate><SearchPage /></AgeGate>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<CreatorAddressGate><Dashboard /></CreatorAddressGate>} />
            <Route path="/vault" element={<CreatorAddressGate><ContentVault /></CreatorAddressGate>} />
            <Route path="/post/new" element={<CreatorAddressGate><PostEditor /></CreatorAddressGate>} />
            <Route path="/messages" element={<AgeGate><Messages /></AgeGate>} />
            <Route path="/statistics" element={<CreatorAddressGate><Statistics /></CreatorAddressGate>} />
            <Route path="/payouts" element={<CreatorAddressGate><Payouts /></CreatorAddressGate>} />
            <Route path="/post/:postId" element={<AgeGate><PostPage /></AgeGate>} />

            <Route path="/live" element={<AgeGate><CreatorAddressGate><LiveStreamWrapper /></CreatorAddressGate></AgeGate>} />
            <Route path="/live/:username" element={<AgeGate><LiveStreamWrapper /></AgeGate>} />

            {/* Rechtliche Routen */}
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            <Route path="/creator-vertrag" element={<CreatorVertrag />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Admin Route */}
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </AppShell>
      )}
      <Toaster />
      <CookieBanner />
    </Router>
  );
}

export default App;