import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ApartmentAdminOverview from './ApartmentAdminOverview';
import BuildingManagement from './BuildingManagement';
import PaymentManagement from './PaymentManagement';
import AdminPaymentStatusTab from './AdminPaymentStatusTab';
import ExpectedCollectionsAdmin from './ExpectedCollectionsAdmin';
import OccupantManagement from './OccupantManagement';

export default function ApartmentAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={false}>
      {activeTab === 'overview' && <ApartmentAdminOverview />}
      {activeTab === 'buildings' && <BuildingManagement />}
      {activeTab === 'occupants' && <OccupantManagement />}
      {activeTab === 'payments' && <PaymentManagement />}
      {activeTab === 'payment-setup' && <ExpectedCollectionsAdmin />}
      {activeTab === 'payment-status' && <AdminPaymentStatusTab />}
    </DashboardLayout>
  );
}
