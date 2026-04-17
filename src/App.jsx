import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHashRoute, navigate } from './lib/router';
import LoginScreen from './modules/auth/LoginScreen';
import CaptureIntro from './modules/sales/CaptureIntro';
import GuestForm from './modules/sales/GuestForm';
import AdminShell from './modules/admin/AdminShell';

export default function App() {
  var { session, saveSession, logout } = useAuth();
  var route = useHashRoute();

  // Route guard — redirect based on auth + role
  useEffect(function () {
    // Not logged in → force to login (unless already there)
    if (!session) {
      if (route !== '/login' && route !== '/') navigate('/login');
      return;
    }

    // Logged in but on login screen → send to their home
    if (route === '/login' || route === '/') {
      navigate(session.role === 'admin' ? '/admin' : '/capture');
      return;
    }

    // Role-based access
    if (route === '/admin' && session.role !== 'admin') {
      navigate('/capture');
      return;
    }
    if ((route === '/capture' || route === '/guest') && session.role !== 'sales') {
      navigate('/admin');
      return;
    }
  }, [session, route]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Render by route
  if (!session || route === '/login' || route === '/') {
    return <LoginScreen onLogin={saveSession} />;
  }

  if (session.role === 'sales') {
    if (route === '/guest') return <GuestForm session={session} />;
    return <CaptureIntro session={session} onLogout={handleLogout} />;
  }

  if (session.role === 'admin') {
    return <AdminShell session={session} onLogout={handleLogout} />;
  }

  // Fallback
  return <LoginScreen onLogin={saveSession} />;
}
