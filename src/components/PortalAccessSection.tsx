import { Users, Info, Shield, Crown, ArrowRight, Home, Sparkles, Lock } from 'lucide-react';

interface PortalAccessSectionProps {
  onNavigate: (path: string) => void;
}

export default function PortalAccessSection({ onNavigate }: PortalAccessSectionProps) {
  return (
    <section className="relative py-20 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md mb-4">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-gray-700">Quick Access</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Portal
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access the right tools for your role in the community
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Occupant Portal - Featured */}
          <div className="lg:col-span-2 group">
            <div className="relative h-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Home className="w-8 h-8 text-white" />
                  </div>
                  <div className="bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-white">RESIDENTS</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">
                  Occupant Portal
                </h3>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  View your payment history, submit maintenance proofs, and track submission status in real-time.
                </p>

                <ul className="space-y-2 mb-8">
                  <li className="flex items-center gap-2 text-blue-50 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                    Track all your payments
                  </li>
                  <li className="flex items-center gap-2 text-blue-50 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                    Submit payment proofs instantly
                  </li>
                  <li className="flex items-center gap-2 text-blue-50 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
                    Get real-time status updates
                  </li>
                </ul>

                <button
                  onClick={() => onNavigate('/occupant')}
                  className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 group/btn"
                >
                  Access Portal
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Learn More About FlatFund Pro */}
          <div className="group">
            <div className="relative h-full bg-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border-2 border-amber-200 hover:border-amber-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-50"></div>

              <div className="relative p-6">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Info className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Discover FlatFund Pro
                </h3>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                  Learn how we're revolutionizing society management with smart automation and secure payment tracking.
                </p>

                <button
                  onClick={() => onNavigate('/marketing')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 px-5 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 group/btn"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Admin Login */}
          <div className="group">
            <div className="relative h-full bg-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-200 hover:border-amber-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50"></div>

              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Apartment Admin
                </h3>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                  Manage your society's payments, track collections, and oversee all maintenance submissions.
                </p>

                <button
                  onClick={() => onNavigate('/admin')}
                  className="w-full bg-gray-900 text-white font-semibold py-3 px-5 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group/btn"
                >
                  Admin Login
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Super Admin - Subtle placement below */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => onNavigate('/super-admin')}
            className="group flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 hover:border-emerald-300"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs text-gray-500 font-medium">Platform Administrator</div>
              <div className="text-sm font-bold text-gray-900">Super Admin Access →</div>
            </div>
          </button>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Bank-level Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Trusted by 100+ Societies</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>AI-Powered Detection</span>
          </div>
        </div>
      </div>
    </section>
  );
}
