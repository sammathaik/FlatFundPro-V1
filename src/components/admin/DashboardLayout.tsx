import { ReactNode, useState } from 'react';
import { LogOut, Building2, Users, FileText, LayoutDashboard, Home, MapPin, BarChart3, Menu, X, ChevronLeft, ChevronRight, UserPlus, TrendingUp, Settings, Shield, HelpCircle, AlertTriangle, Brain, MessageSquare, Mail, Bell, Calculator, UserCheck, Sliders, Wallet, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCountryFlag } from '../../lib/utils';
import AdminNotifications from './AdminNotifications';
import SuperAdminNotifications from './SuperAdminNotifications';

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
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'apartments', label: 'Apartments', icon: Building2 },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'leads', label: 'Lead Generation', icon: UserPlus },
    { id: 'fraud-detection', label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'analytics', label: 'Executive Summary', icon: TrendingUp },
    { id: 'faq', label: 'Help Center', icon: HelpCircle },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: Shield },
  ];

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'collections', label: 'Collections', icon: Wallet },
    { id: 'payments', label: 'Payment Submissions', icon: FileText },
    { id: 'payment-setup', label: 'Fund Collection Setup', icon: Sliders },
    { id: 'payment-status', label: 'Collection Summary', icon: BarChart3 },
    { id: 'budget-planning', label: 'Budget Planning', icon: Calculator },
    { id: 'buildings', label: 'Buildings & Flats', icon: Building2 },
    { id: 'occupants', label: 'Occupants', icon: Users },
    { id: 'subscribers', label: 'Subscriber List', icon: UserCheck },
    { id: 'fraud-detection', label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'classification', label: 'AI Classification', icon: Brain },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'communications', label: 'Communication Audit', icon: Mail },
    { id: 'whatsapp-audit', label: 'WhatsApp Audit', icon: MessageSquare },
    { id: 'whatsapp-notifications', label: 'WhatsApp Preview', icon: Eye },
    { id: 'analytics', label: 'Executive Summary', icon: TrendingUp },
    { id: 'settings', label: 'Admin Tools', icon: Settings },
    { id: 'faq', label: 'Help Center', icon: HelpCircle },
  ];

  const tabs = isSuperAdmin ? superAdminTabs : adminTabs;
  const userName = isSuperAdmin ? superAdminData?.name : adminData?.admin_name;

  const visibleTabs = tabs.filter(tab => tab.id !== 'diagnostic');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left Section: Logo + Context */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Logo - Subtle Brand Presence */}
              <img
                src="/flatfundprologo.jpg"
                alt="FlatFund Pro"
                className="h-10 sm:h-11 object-contain flex-shrink-0"
              />

              {/* Vertical Divider */}
              <div className="hidden md:block h-10 w-px bg-gray-200"></div>

              {/* Primary Context: Apartment Name */}
              <div className="flex-1 min-w-0">
                {!isSuperAdmin && adminData?.apartment ? (
                  <>
                    {/* Apartment Name - PRIMARY */}
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate leading-tight">
                      {adminData.apartment.apartment_name}
                    </h1>
                    {/* Location - TERTIARY */}
                    {(adminData.apartment.city || adminData.apartment.country) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500">
                          {[adminData.apartment.city, adminData.apartment.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
                  </h1>
                )}
              </div>
            </div>

            {/* Right Section: Admin Profile + Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Admin Profile - SECONDARY */}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">
                    {isSuperAdmin ? 'Super Administrator' : 'Apartment Admin'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm">
                  {userName?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isSuperAdmin ? (
                  <SuperAdminNotifications onNavigateToNotifications={() => onTabChange('notifications')} />
                ) : (
                  <AdminNotifications onNavigateToNotifications={() => onTabChange('notifications')} />
                )}
                <a
                  href="/"
                  className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium px-3 py-2 hover:bg-blue-50 rounded-lg"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden lg:inline">Home</span>
                </a>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Admin Profile - Shows below main header on small screens */}
          <div className="md:hidden flex items-center gap-2.5 mt-3 pt-3 border-t border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? 'Super Administrator' : 'Apartment Admin'}
              </p>
            </div>
          </div>
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
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
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
                {visibleTabs.map((tab) => {
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
                          ? 'bg-blue-50 text-blue-700 font-medium'
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
