import { useState } from 'react';
import { Lock, Mail, AlertCircle, Loader2, Shield, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  portalType?: 'admin' | 'super-admin';
  onBack?: () => void;
}

export default function LoginPage({ portalType = 'admin', onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const isSuperAdmin = portalType === 'super-admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isSuperAdmin
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900'
        : 'bg-gradient-to-br from-amber-50 via-white to-orange-50'
    }`}>
      <div className="w-full max-w-md">
        <div className={`rounded-2xl shadow-xl overflow-hidden ${
          isSuperAdmin ? 'bg-slate-800 border border-emerald-500/30' : 'bg-white'
        }`}>
          <div className={`px-6 py-8 text-center ${
            isSuperAdmin
              ? 'bg-gradient-to-r from-emerald-700 to-emerald-600'
              : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}>
            {isSuperAdmin ? (
              <Shield className="w-20 h-20 text-white mx-auto mb-4" />
            ) : (
              <Building2 className="w-20 h-20 text-white mx-auto mb-4" />
            )}
            <h1 className="text-2xl font-bold text-white">
              {isSuperAdmin ? 'Super Admin Portal' : 'Apartment Admin Portal'}
            </h1>
            <p className={`mt-2 ${isSuperAdmin ? 'text-emerald-100' : 'text-amber-100'}`}>
              {isSuperAdmin ? 'Master system access' : 'Sign in to manage your apartment'}
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${
                  isSuperAdmin ? 'text-emerald-100' : 'text-gray-700'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isSuperAdmin ? 'text-emerald-400' : 'text-gray-400'
                  }`} />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      isSuperAdmin
                        ? 'bg-slate-700 border-slate-600 text-white focus:ring-emerald-500 placeholder-slate-400'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-amber-500 placeholder-gray-400'
                    }`}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${
                  isSuperAdmin ? 'text-emerald-100' : 'text-gray-700'
                }`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isSuperAdmin ? 'text-emerald-400' : 'text-gray-400'
                  }`} />
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      isSuperAdmin
                        ? 'bg-slate-700 border-slate-600 text-white focus:ring-emerald-500 placeholder-slate-400'
                        : 'bg-white border-gray-300 text-gray-900 focus:ring-amber-500 placeholder-gray-400'
                    }`}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className={`border-l-4 p-4 rounded ${
                  isSuperAdmin
                    ? 'bg-red-900/30 border-red-500'
                    : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <p className={`text-sm ${isSuperAdmin ? 'text-red-200' : 'text-red-800'}`}>{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                  isSuperAdmin
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600'
                    : 'bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400'
                } text-white disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className={`mt-6 pt-6 border-t ${
              isSuperAdmin ? 'border-slate-700' : 'border-gray-200'
            }`}>
              <p className={`text-xs text-center ${
                isSuperAdmin ? 'text-slate-400' : 'text-gray-500'
              }`}>
                For security purposes, only authorized administrators can access this portal.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onBack || (() => window.location.href = '/')}
            className={`font-medium text-sm transition-colors ${
              isSuperAdmin
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
