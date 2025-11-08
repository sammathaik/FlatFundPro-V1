import { ReactNode } from 'react';
import { LogOut, Building2, Users, FileText, LayoutDashboard, Home, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCountryFlag } from '../../lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSuperAdmin?: boolean;
}

export default function DashboardLayout({ children, activeTab, onTabChange, isSuperAdmin = false }: DashboardLayoutProps) {
  const { signOut, superAdminData, adminData } = useAuth();

  const superAdminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'apartments', label: 'Apartments', icon: Building2 },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'payments', label: 'All Payments', icon: FileText },
  ];

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buildings', label: 'Buildings & Flats', icon: Building2 },
    { id: 'payments', label: 'Payment Submissions', icon: FileText },
  ];

  const tabs = isSuperAdmin ? superAdminTabs : adminTabs;
  const userName = isSuperAdmin ? superAdminData?.name : adminData?.admin_name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <header className="bg-white shadow-md sticky top-0 z-10 border-b-2 border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[120px] py-4 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <img
                src="/FlatFundPro-2-Logo.jpeg"
                alt="FlatFund Pro"
                className="h-16 sm:h-18 md:h-20 lg:h-24 object-contain flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
                </h1>
                {!isSuperAdmin && adminData?.apartment && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="bg-amber-100 border border-amber-300 px-4 py-1.5 rounded-lg shadow-sm">
                      <p className="text-sm font-semibold text-amber-900 whitespace-nowrap">
                        {adminData.apartment.apartment_name}
                      </p>
                    </div>
                    {(adminData.apartment.city || adminData.apartment.country) && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-lg shadow-sm">
                        <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-xl" title={adminData.apartment.country || ''}>
                          {getCountryFlag(adminData.apartment.country)}
                        </span>
                        <span className="text-sm font-medium text-blue-900 whitespace-nowrap">
                          {[adminData.apartment.city, adminData.apartment.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-600">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <a
                href="/"
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors text-sm font-medium px-3 py-2 hover:bg-amber-50 rounded-lg"
              >
                <Home className="w-4 h-4" />
                <span className="hidden lg:inline">Public Portal</span>
              </a>
              <button
                onClick={signOut}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-amber-600 text-amber-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
