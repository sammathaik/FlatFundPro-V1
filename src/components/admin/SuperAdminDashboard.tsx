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
import WhatsAppNotifications from './WhatsAppNotifications';
import { CommunicationAuditDashboard } from './CommunicationAuditDashboard';
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
      {activeTab === 'communications' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              As a Super Admin, you can view communication audit trails for all apartments. Select an apartment from the Apartments tab to view specific communication history.
            </p>
          </div>
        </div>
      )}
      {activeTab === 'whatsapp-notifications' && <WhatsAppNotifications />}
      {activeTab === 'faq' && <FAQManagement />}
      {activeTab === 'settings' && <SystemSettings />}
      {activeTab === 'audit' && <AuditLogs />}

      {/* Super Admin Chatbot */}
      <ChatBot userRole="super_admin" userId={adminData?.user_id} />
    </DashboardLayout>
  );
}
