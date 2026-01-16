import { Shield, Building2, Users, Database, Activity, Lock } from 'lucide-react';

interface SuperAdminLandingPageProps {
  onLogin: () => void;
  onBackToPublic: () => void;
}

export default function SuperAdminLandingPage({ onLogin, onBackToPublic }: SuperAdminLandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/flatfundpro-logo.svg"
              alt="FlatFund Pro"
              className="h-24 sm:h-28 w-auto object-contain mb-6 drop-shadow-2xl"
            />
            <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl shadow-2xl mb-6 border-2 border-emerald-400/30">
              <div className="flex items-center gap-3">
                <Shield className="w-10 h-10 drop-shadow-lg" />
                <h2 className="text-3xl sm:text-4xl font-bold drop-shadow-lg">Super Administrator Portal</h2>
              </div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm border-2 border-emerald-500/30 rounded-xl shadow-2xl p-6 max-w-3xl">
              <p className="text-xl text-emerald-100 leading-relaxed">
                <span className="font-semibold text-emerald-400">Command Central for Platform Management</span> – Oversee all apartments, manage administrators, monitor system-wide payments, and maintain complete control across your entire property management ecosystem.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Building2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Apartment Management</h3>
              <p className="text-emerald-200 text-sm">
                Create, configure, and monitor all apartment complexes across the platform
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Admin Control</h3>
              <p className="text-emerald-200 text-sm">
                Assign and manage apartment administrators with granular permissions
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Global Payments</h3>
              <p className="text-emerald-200 text-sm">
                View and analyze all payment transactions across all apartments
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Activity className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">System Analytics</h3>
              <p className="text-emerald-200 text-sm">
                Monitor platform health, usage metrics, and performance indicators
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Security & Audit</h3>
              <p className="text-emerald-200 text-sm">
                Access comprehensive audit logs and security management tools
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/20 rounded-2xl shadow-lg p-6 hover:shadow-emerald-500/20 hover:shadow-xl transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 p-4 rounded-lg mb-4">
                <Shield className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Role Management</h3>
              <p className="text-emerald-200 text-sm">
                Configure access levels and permissions for all system users
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl shadow-xl p-8 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h3 className="text-2xl font-bold text-white">Secure Access</h3>
          </div>
          <button
            onClick={onLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
          >
            Sign In as Super Admin
          </button>
          <button
            onClick={onBackToPublic}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-emerald-100 py-3 px-6 rounded-lg font-medium transition-colors border border-slate-600"
          >
            ← Back to Public Portal
          </button>
        </div>

        <div className="text-center mt-8 text-emerald-300/60 text-xs">
          <p>Protected by enterprise-grade security • All actions are logged</p>
        </div>
      </div>
    </div>
  );
}
