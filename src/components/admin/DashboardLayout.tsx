import { ReactNode, useState } from 'react';
import { LogOut, Building2, Users, FileText, LayoutDashboard, Home, MapPin, BarChart3, Menu, X, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const superAdminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'apartments', label: 'Apartments', icon: Building2 },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'leads', label: 'Lead Generation', icon: UserPlus },
  ];

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buildings', label: 'Buildings & Flats', icon: Building2 },
    { id: 'occupants', label: 'Occupants', icon: Users },
    { id: 'payments', label: 'Payment Submissions', icon: FileText },
    { id: 'payment-setup', label: 'Payment Setup', icon: FileText },
    { id: 'payment-status', label: 'Payment Status', icon: BarChart3 },
  ];

  const tabs = isSuperAdmin ? superAdminTabs : adminTabs;
  const userName = isSuperAdmin ? superAdminData?.name : adminData?.admin_name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-20 border-b-2 border-gray-100">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src="/FlatFundPro-2-Logo.jpeg"
                alt="FlatFund Pro"
                className="h-12 sm:h-14 object-contain flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{userName}</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="/"
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors text-sm font-medium px-3 py-2 hover:bg-amber-50 rounded-lg"
              >
                <Home className="w-4 h-4" />
              </a>
              <button
                onClick={signOut}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Apartment Info Banner - For Admin Only */}
          {!isSuperAdmin && adminData?.apartment && (
            <div className="flex flex-wrap items-center gap-2 pb-3 pt-1">
              <div className="bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg shadow-sm">
                <p className="text-xs sm:text-sm font-semibold text-amber-900">
                  {adminData.apartment.apartment_name}
                </p>
              </div>
              {(adminData.apartment.city || adminData.apartment.country) && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-base sm:text-lg" title={adminData.apartment.country || ''}>
                    {getCountryFlag(adminData.apartment.country)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-blue-900">
                    {[adminData.apartment.city, adminData.apartment.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:block bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="sticky top-20 p-4">
            <div className="flex items-center justify-between mb-4">
              {sidebarOpen && <h2 className="font-semibold text-gray-700">Navigation</h2>}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 ml-auto"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-amber-50 text-amber-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={!sidebarOpen ? tab.label : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{tab.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-white w-64 h-full p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-700">Navigation</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onTabChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-amber-50 text-amber-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
