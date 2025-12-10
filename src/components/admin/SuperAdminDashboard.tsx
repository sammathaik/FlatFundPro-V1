import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import ApartmentManagement from './ApartmentManagement';
import AdminManagement from './AdminManagement';
import SuperAdminOverview from './SuperAdminOverview';
import AllPaymentsView from './AllPaymentsView';
import LeadsManagement from './LeadsManagement';

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab} isSuperAdmin={true}>
      {activeTab === 'overview' && <SuperAdminOverview />}
      {activeTab === 'apartments' && <ApartmentManagement />}
      {activeTab === 'admins' && <AdminManagement />}
      {activeTab === 'payments' && <AllPaymentsView />}
      {activeTab === 'leads' && <LeadsManagement />}
    </DashboardLayout>
  );
}
