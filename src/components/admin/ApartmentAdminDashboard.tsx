import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ApartmentAdminOverview from './ApartmentAdminOverview';
import BuildingManagement from './BuildingManagement';
import PaymentManagement from './PaymentManagement';
import AdminPaymentStatusTab from './AdminPaymentStatusTab';
import ExpectedCollectionsAdmin from './ExpectedCollectionsAdmin';
import OccupantManagement from './OccupantManagement';
import FAQManagement from './FAQManagement';
import { FraudDetectionDashboard } from './FraudDetectionDashboard';
import AnalyticsReports from './AnalyticsReports';
import MaintenanceCollectionsActiveSummary from './MaintenanceCollectionsActiveSummary';
import ClassificationAnalytics from './ClassificationAnalytics';
import WhatsAppNotifications from './WhatsAppNotifications';
import DiagnosticTest from './DiagnosticTest';
import { useAuth } from '../../contexts/AuthContext';
import ChatBot from '../ChatBot';

export default function ApartmentAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { adminData } = useAuth();

  console.log('Admin Data:', adminData);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={false}>
      {activeTab === 'overview' && <ApartmentAdminOverview />}
      {activeTab === 'buildings' && <BuildingManagement />}
      {activeTab === 'occupants' && <OccupantManagement />}
      {activeTab === 'payments' && <PaymentManagement />}
      {activeTab === 'payment-setup' && <ExpectedCollectionsAdmin />}
      {activeTab === 'collections' && <MaintenanceCollectionsActiveSummary />}
      {activeTab === 'payment-status' && <AdminPaymentStatusTab />}
      {activeTab === 'analytics' && (
        adminData?.apartment_id ? (
          <AnalyticsReports buildingId={adminData.apartment_id} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg font-semibold mb-2">Analytics Not Available</p>
            <p className="text-sm">No apartment access found. Please ensure you have proper access.</p>
          </div>
        )
      )}
      {activeTab === 'fraud-detection' && <FraudDetectionDashboard apartmentId={adminData?.apartment_id} />}
      {activeTab === 'classification' && <ClassificationAnalytics />}
      {activeTab === 'whatsapp-notifications' && <WhatsAppNotifications />}
      {activeTab === 'diagnostic' && <DiagnosticTest />}
      {activeTab === 'faq' && <FAQManagement />}

      {/* Admin Chatbot */}
      <ChatBot userRole="admin" userId={adminData?.user_id} apartmentId={adminData?.apartment_id} />
    </DashboardLayout>
  );
}
