import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import PaymentStatusDashboard from './PaymentStatusDashboard';
import { supabase, Apartment } from '../../lib/supabase';

interface PublicPaymentStatusPageProps {
  navigate: (path: string) => void;
}

export default function PublicPaymentStatusPage({ navigate }: PublicPaymentStatusPageProps) {
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const accessCode = params.get('apartment');

  useEffect(() => {
    if (!accessCode) {
      setError('Missing apartment access code. Please use the link shared by your admin team.');
      setLoading(false);
      return;
    }

    async function loadApartment() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: queryError } = await supabase
          .from('apartments')
          .select('*')
          .eq('public_access_code', accessCode)
          .eq('status', 'active')
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) {
          setError('We could not find an active apartment for this link. Please contact your admin.');
          setApartment(null);
        } else {
          setApartment(data);
        }
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Unable to load apartment details.';
        setError(message);
        setApartment(null);
      } finally {
        setLoading(false);
      }
    }

    loadApartment();
  }, [accessCode]);

  if (!accessCode) {
    return (
      <GuestLayout>
        <ErrorCard
          message="Missing access code"
          detail="Use the full link shared by your apartment admin to view payment status."
          actionLabel="Back to Public Portal"
          onAction={() => navigate('/')}
        />
      </GuestLayout>
    );
  }

  if (loading) {
    return (
      <GuestLayout>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading payment status...</p>
        </div>
      </GuestLayout>
    );
  }

  if (error || !apartment) {
    return (
      <GuestLayout>
        <ErrorCard
          message="Unable to load payment status"
          detail={error || 'Unknown error'}
          actionLabel="Contact Admin"
          onAction={() => navigate('/')}
        />
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <PaymentStatusDashboard
        apartmentId={apartment.id}
        apartmentName={apartment.apartment_name}
        allowManagement={false}
        accessCode={accessCode}
        publicAccessCode={apartment.public_access_code || undefined}
      />
      <div className="mt-10 text-center">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          Apartment admin? Sign in →
        </button>
      </div>
    </GuestLayout>
  );
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-blue-100 p-6 sm:p-10">
        {children}
      </div>
    </div>
  );
}

function ErrorCard({
  message,
  detail,
  actionLabel,
  onAction,
}: {
  message: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
      <AlertTriangle className="w-10 h-10 text-red-600" />
      <div>
        <h3 className="text-xl font-semibold text-red-900">{message}</h3>
        <p className="text-red-700 mt-2">{detail}</p>
      </div>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-red-200 text-red-700 hover:bg-red-100 transition"
      >
        {actionLabel}
      </button>
    </div>
  );
}

