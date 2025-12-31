import { ReactNode, useState } from 'react';
import { LogOut, Building2, Users, FileText, LayoutDashboard, Home, MapPin, BarChart3, Menu, X, ChevronLeft, ChevronRight, UserPlus, TrendingUp, Settings, Shield, HelpCircle, AlertTriangle, DollarSign, Brain, MessageSquare, Mail, Bell } from 'lucide-react';
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
    { id: 'communications', label: 'Communication Audit', icon: Mail },
    { id: 'whatsapp-audit', label: 'WhatsApp Audit', icon: MessageSquare },
    { id: 'whatsapp-notifications', label: 'WhatsApp Preview', icon: MessageSquare },
    { id: 'faq', label: 'Help Center', icon: HelpCircle },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: Shield },
  ];

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'buildings', label: 'Buildings & Flats', icon: Building2 },
    { id: 'occupants', label: 'Occupants', icon: Users },
    { id: 'payments', label: 'Payment Submissions', icon: FileText },
    { id: 'payment-setup', label: 'Fund Collection Setup', icon: FileText },
    { id: 'collections', label: 'Collections', icon: DollarSign },
    { id: 'payment-status', label: 'Collection Summary', icon: BarChart3 },
    { id: 'analytics', label: 'Executive Summary', icon: TrendingUp },
    { id: 'fraud-detection', label: 'Fraud Detection', icon: AlertTriangle },
    { id: 'classification', label: 'AI Classification', icon: Brain },
    { id: 'communications', label: 'Communication Audit', icon: Mail },
    { id: 'whatsapp-audit', label: 'WhatsApp Audit', icon: MessageSquare },
    { id: 'whatsapp-notifications', label: 'WhatsApp Preview', icon: MessageSquare },
    { id: 'diagnostic', label: 'API Diagnostic', icon: Settings },
    { id: 'faq', label: 'Help Center', icon: HelpCircle },
  ];

  const tabs = isSuperAdmin ? superAdminTabs : adminTabs;
  const userName = isSuperAdmin ? superAdminData?.name : adminData?.admin_name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-20 border-b-2 border-blue-100">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src="/flatfundpro-2-logo.jpeg"
                alt="FlatFund Pro"
                className="h-14 sm:h-16 lg:h-18 object-contain flex-shrink-0 drop-shadow-md"
              />
              <div className="hidden md:block h-12 w-px bg-gray-300"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-base sm:text-lg font-bold text-gray-900">
                    {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
                  </h1>
                  {!isSuperAdmin && adminData?.apartment && (
                    <>
                      <span className="hidden lg:inline text-gray-400">|</span>
                      <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1 rounded-lg">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-semibold text-blue-900 truncate max-w-xs">
                          {adminData.apartment.apartment_name}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600 truncate">{userName}</p>
                  {!isSuperAdmin && adminData?.apartment && (adminData.apartment.city || adminData.apartment.country) && (
                    <>
                      <span className="hidden xl:inline text-gray-400">•</span>
                      <div className="hidden xl:flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-xs" title={adminData.apartment.country || ''}>
                          {getCountryFlag(adminData.apartment.country)}
                        </span>
                        <span className="text-xs font-medium text-blue-900 truncate max-w-xs">
                          {[adminData.apartment.city, adminData.apartment.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
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
                <span className="hidden md:inline">Home</span>
              </a>
              <button
                onClick={signOut}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Apartment Info - Shows on smaller screens */}
          {!isSuperAdmin && adminData?.apartment && (
            <div className="flex lg:hidden flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-blue-900">
                  {adminData.apartment.apartment_name}
                </span>
              </div>
              {(adminData.apartment.city || adminData.apartment.country) && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm" title={adminData.apartment.country || ''}>
                    {getCountryFlag(adminData.apartment.country)}
                  </span>
                  <span className="text-xs font-medium text-blue-900">
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
