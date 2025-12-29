import PaymentStatusDashboard from './PaymentStatusDashboard';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPaymentStatusTab() {
  const { adminData } = useAuth();

  if (!adminData?.apartment_id || !adminData.apartment) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-900 font-medium">Apartment information is loading. Please try again shortly.</p>
      </div>
    );
  }

  return (
    <PaymentStatusDashboard
      apartmentId={adminData.apartment_id}
      apartmentName={adminData.apartment.apartment_name}
      allowManagement={true}
      publicAccessCode={adminData.apartment.public_access_code || undefined}
      showChart
    />
  );
}

