import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ApartmentAdminOverview from './ApartmentAdminOverview';
import BuildingManagement from './BuildingManagement';
import PaymentManagement from './PaymentManagement';

export default function ApartmentAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={false}>
      {activeTab === 'overview' && <ApartmentAdminOverview />}
      {activeTab === 'buildings' && <BuildingManagement />}
      {activeTab === 'payments' && <PaymentManagement />}
    </DashboardLayout>
  );
}
