import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import PublicLandingPage from './components/PublicLandingPage';
import AdminLandingPage from './components/admin/AdminLandingPage';
import SuperAdminLandingPage from './components/admin/SuperAdminLandingPage';
import LoginPage from './components/LoginPage';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import ApartmentAdminDashboard from './components/admin/ApartmentAdminDashboard';
import MarketingLandingPage from './components/MarketingLandingPage';
import QRCodePrintPage from './components/QRCodePrintPage';
import OccupantLoginPage from './components/occupant/OccupantLoginPage';
import OccupantDashboard from './components/occupant/OccupantDashboard';
import { Loader2, AlertTriangle } from 'lucide-react';
import PublicPaymentStatusPage from './components/admin/PublicPaymentStatusPage';
import { DiagnosticPage } from './components/DiagnosticPage';
import OCRTestingPage from './components/admin/OCRTestingPage';
import { isSupabaseConfigured } from './lib/supabase';

function App() {
  const { user, userRole, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [occupant, setOccupant] = useState<any>(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (currentPath === '/diagnostic') {
    return <DiagnosticPage />;
  }

  if (currentPath === '/ocr-test') {
    return <OCRTestingPage />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-2xl bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <AlertTriangle className="w-12 h-12 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-800">Configuration Error</h1>
          </div>
          <p className="text-gray-600 mb-4">
            The application cannot connect to the database because environment variables are missing.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="font-semibold text-red-800 mb-2">Missing Configuration:</p>
            <ul className="list-disc list-inside text-red-700 space-y-1">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.href = '/diagnostic'}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
          >
            View Diagnostic Page
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPath === '/super-admin') {
    if (!user) {
      return (
        <SuperAdminLandingPage
          onLogin={() => navigate('/super-admin/login')}
          onBackToPublic={() => navigate('/')}
        />
      );
    }

    if (userRole === 'super_admin') {
      return <SuperAdminDashboard />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
        <div className="max-w-md bg-slate-800 border border-emerald-500/30 rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-emerald-200 mb-6">You do not have Super Administrator privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
          >
            Go to Public Portal
          </button>
        </div>
      </div>
    );
  }

  if (currentPath === '/super-admin/login') {
    if (user && userRole === 'super_admin') {
      navigate('/super-admin');
      return null;
    }
    return <LoginPage portalType="super-admin" onBack={() => navigate('/super-admin')} />;
  }

  if (currentPath.startsWith('/admin/payment-status')) {
    return <PublicPaymentStatusPage navigate={navigate} />;
  }

  if (currentPath === '/admin') {
    if (!user) {
      return (
        <AdminLandingPage
          onLogin={() => navigate('/admin/login')}
          onBackToPublic={() => navigate('/')}
        />
      );
    }

    if (userRole === 'admin') {
      return <ApartmentAdminDashboard />;
    }

    if (userRole === 'super_admin') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
          <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Wrong Portal</h2>
            <p className="text-gray-600 mb-6">You are a Super Administrator. Please use the Super Admin portal.</p>
            <button
              onClick={() => navigate('/super-admin')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
            >
              Go to Super Admin Portal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">You do not have Apartment Administrator privileges.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
          >
            Go to Public Portal
          </button>
        </div>
      </div>
    );
  }

  if (currentPath === '/admin/login') {
    if (user && userRole === 'admin') {
      navigate('/admin');
      return null;
    }
    return <LoginPage portalType="admin" onBack={() => navigate('/admin')} />;
  }

  if (currentPath === '/marketing' || currentPath === '/home') {
    return <MarketingLandingPage navigate={navigate} />;
  }

  if (currentPath === '/qr-print') {
    return <QRCodePrintPage onBack={() => navigate('/marketing')} />;
  }

  if (currentPath === '/login') {
    return <LoginPage portalType="admin" onBack={() => navigate('/')} />;
  }

  if (currentPath === '/occupant') {
    if (!occupant) {
      return (
        <OccupantLoginPage
          onLoginSuccess={(occupantData) => {
            setOccupant(occupantData);
            navigate('/occupant/dashboard');
          }}
          onBack={() => navigate('/')}
        />
      );
    }
    navigate('/occupant/dashboard');
    return null;
  }

  if (currentPath === '/occupant/dashboard') {
    if (!occupant) {
      navigate('/occupant');
      return null;
    }
    return (
      <OccupantDashboard
        occupant={occupant}
        onLogout={() => {
          setOccupant(null);
          navigate('/');
        }}
      />
    );
  }

  return <PublicLandingPage onNavigate={navigate} />;
}

export default App;
