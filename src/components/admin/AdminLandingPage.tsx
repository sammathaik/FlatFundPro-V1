import { Building2, Users, FileText, TrendingUp } from 'lucide-react';

interface AdminLandingPageProps {
  onLogin: () => void;
  onBackToPublic: () => void;
}

export default function AdminLandingPage({ onLogin, onBackToPublic }: AdminLandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/AppLogo-FlatFund Pro.jpg"
              alt="FlatFund Pro"
              className="h-24 sm:h-28 w-auto object-contain mb-6 drop-shadow-lg"
            />
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-xl mb-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-10 h-10" />
                <h2 className="text-3xl sm:text-4xl font-bold">Apartment Admin Portal</h2>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl">
              <p className="text-xl text-gray-700 leading-relaxed">
                <span className="font-semibold text-amber-600">Streamline your apartment management</span> – Handle maintenance payments, track submissions, manage building structures, and keep residents organized. All the tools you need in one powerful dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Management</h3>
                <p className="text-gray-600">
                  Review, approve, and track all maintenance payment submissions from your residents
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Building Structure</h3>
                <p className="text-gray-600">
                  Manage blocks, phases, towers, and flat numbers for your apartment complex
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600">
                  View real-time statistics and insights about payment collection and trends
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Resident Records</h3>
                <p className="text-gray-600">
                  Access complete payment history and contact information for all residents
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Access Admin Portal</h3>
          <button
            onClick={onLogin}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors shadow-md hover:shadow-lg"
          >
            Sign In as Apartment Admin
          </button>
          <button
            onClick={onBackToPublic}
            className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
          >
            ← Back to Public Portal
          </button>
        </div>

        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>Need help? Contact your Super Administrator</p>
        </div>
      </div>
    </div>
  );
}
