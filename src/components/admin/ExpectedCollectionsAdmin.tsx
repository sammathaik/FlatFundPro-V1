import CollectionManagement from './CollectionManagement';
import { useAuth } from '../../contexts/AuthContext';

export default function ExpectedCollectionsAdmin() {
  const { adminData } = useAuth();

  if (!adminData?.apartment_id || !adminData.apartment) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-900 font-medium">
          Apartment information is loading. Please try again in a moment.
        </p>
      </div>
    );
  }

  return (
    <CollectionManagement
      apartmentId={adminData.apartment_id}
      apartmentName={adminData.apartment.apartment_name}
    />
  );
}



