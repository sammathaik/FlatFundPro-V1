import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ApartmentManagement from './ApartmentManagement';
import AdminManagement from './AdminManagement';
import SuperAdminOverview from './SuperAdminOverview';
import LeadsManagement from './LeadsManagement';
import SuperAdminExecutiveSummary from './SuperAdminExecutiveSummary';
import SystemSettings from './SystemSettings';
import AuditLogs from './AuditLogs';
import FAQManagement from './FAQManagement';
import { FraudDetectionDashboard } from './FraudDetectionDashboard';
import ChatBot from '../ChatBot';
import { useAuth } from '../../contexts/AuthContext';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { adminData } = useAuth();

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={true}>
      {activeTab === 'overview' && <SuperAdminOverview />}
      {activeTab === 'apartments' && <ApartmentManagement />}
      {activeTab === 'admins' && <AdminManagement />}
      {activeTab === 'leads' && <LeadsManagement />}
      {activeTab === 'fraud-detection' && <FraudDetectionDashboard />}
      {activeTab === 'analytics' && <SuperAdminExecutiveSummary />}
      {activeTab === 'faq' && <FAQManagement />}
      {activeTab === 'settings' && <SystemSettings />}
      {activeTab === 'audit' && <AuditLogs />}

      {/* Super Admin Chatbot */}
      <ChatBot userRole="super_admin" userId={adminData?.user_id} />
    </DashboardLayout>
  );
}
