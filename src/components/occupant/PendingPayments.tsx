import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, IndianRupee, Clock, CreditCard, Info, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PendingPayment {
  collection_id: string;
  collection_name: string;
  payment_type: string;
  payment_frequency: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  overdue_days: number;
  late_fee: number;
  status: 'Paid' | 'Partially Paid' | 'Due' | 'Overdue';
}

interface PendingPaymentsProps {
  flatId: string;
  email: string;
  mobile?: string;
  onPayNow: (collection: PendingPayment) => void;
}

export default function PendingPayments({ flatId, email, mobile, onPayNow }: PendingPaymentsProps) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPayments();
  }, [flatId, email, mobile]);

  const loadPendingPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_pending_payments_for_flat', {
        p_flat_id: flatId,
        p_email: email,
        p_mobile: mobile || null
      });

      if (rpcError) throw rpcError;

      setPendingPayments(data || []);
    } catch (err: any) {
      console.error('Error loading pending payments:', err);
      setError('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'Due':
        return <Clock className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getOverdueDaysText = (days: number) => {
    if (days === 0) return null;
    if (days === 1) return '1 day overdue';
    return `${days} days overdue`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading pending payments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button
              onClick={loadPendingPayments}
              className="text-sm text-red-600 hover:text-red-700 underline mt-2"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Pending Payments</h2>
            <p className="text-blue-100 text-sm">
              {pendingPayments.length === 0
                ? 'All payments are up to date'
                : `${pendingPayments.length} payment${pendingPayments.length !== 1 ? 's' : ''} pending`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {pendingPayments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">You have no pending payments at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.collection_id}
                className={`border-2 rounded-xl p-5 transition-all hover:shadow-md ${
                  payment.status === 'Overdue'
                    ? 'border-red-300 bg-red-50'
                    : payment.status === 'Due'
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-blue-300 bg-blue-50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{payment.collection_name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(
                              payment.status
                            )}`}
                          >
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-medium capitalize">
                            {payment.payment_frequency}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize">{payment.payment_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Calendar className="w-3 h-3" />
                          Due Date
                        </div>
                        <p className="text-sm font-bold text-gray-900">{formatDate(payment.due_date)}</p>
                        {payment.overdue_days > 0 && (
                          <p className="text-xs text-red-600 font-semibold mt-1">
                            {getOverdueDaysText(payment.overdue_days)}
                          </p>
                        )}
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <IndianRupee className="w-3 h-3" />
                          Amount Due
                        </div>
                        <p className="text-sm font-bold text-gray-900">₹{payment.amount_due.toLocaleString()}</p>
                      </div>

                      {payment.amount_paid > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                            <IndianRupee className="w-3 h-3" />
                            Paid
                          </div>
                          <p className="text-sm font-bold text-green-600">₹{payment.amount_paid.toLocaleString()}</p>
                        </div>
                      )}

                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <IndianRupee className="w-3 h-3" />
                          Balance
                        </div>
                        <p className="text-sm font-bold text-red-600">₹{payment.balance.toLocaleString()}</p>
                      </div>
                    </div>

                    {payment.late_fee > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <span className="font-semibold">Late Fee: ₹{payment.late_fee.toLocaleString()}</span>
                          <span className="text-xs block mt-1">
                            Additional charges may apply as per society rules
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:w-40 flex flex-col gap-2">
                    <button
                      onClick={() => onPayNow(payment)}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-white transition-all shadow-md ${
                        payment.status === 'Overdue'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
