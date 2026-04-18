import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHashRoute, navigate } from './lib/router';
import LoginScreen from './modules/auth/LoginScreen';
import CaptureIntro from './modules/sales/CaptureIntro';
import GuestForm from './modules/sales/GuestForm';
import AdminShell from './modules/admin/AdminShell';

export default function App() {
  var { session, saveSession, logout, loading } = useAuth();
  var route = useHashRoute();

  // Route guard — admin routes need auth, sales routes are public
  useEffect(function () {
    if (route === '/admin' && !session) {
      navigate('/login');
      return;
    }
    if (route === '/login' && session && session.role === 'admin') {
      navigate('/admin');
      return;
    }
    // Default landing goes to capture
    if (route === '/' || route === '/login') {
      if (session && session.role === 'admin') {
        navigate('/admin');
      } else if (route === '/') {
        navigate('/capture');
      }
    }
  }, [session, route]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (loading) return null;

  // Public routes — no auth needed
  if (route === '/capture') return <CaptureIntro />;
  if (route === '/guest') return <GuestForm />;

  // Admin — auth required
  if (route === '/admin' && session && session.role === 'admin') {
    return <AdminShell session={session} onLogout={handleLogout} />;
  }

  // Login screen (for admin access only)
  return <LoginScreen onLogin={saveSession} />;
}
