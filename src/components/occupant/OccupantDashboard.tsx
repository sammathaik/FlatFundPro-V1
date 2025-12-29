import { useState, useEffect } from 'react';
import {
  Home,
  LogOut,
  Calendar,
  IndianRupee,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  User,
  Building,
  Mail,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HelpCenter from './HelpCenter';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  contingency: 'Contingency',
  emergency: 'Emergency',
};

interface OccupantDashboardProps {
  occupant: any;
  onLogout: () => void;
}

interface Payment {
  id: string;
  name: string;
  payment_amount: number | null;
  payment_date: string | null;
  payment_type: string;
  payment_quarter: string;
  platform: string | null;
  transaction_reference: string | null;
  comments: string | null;
  created_at: string;
  status: string;
}

interface ApartmentInfo {
  apartment_name: string;
  block_name: string;
  flat_number: string;
}

export default function OccupantDashboard({ occupant, onLogout }: OccupantDashboardProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartmentInfo, setApartmentInfo] = useState<ApartmentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [allFlats, setAllFlats] = useState<any[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string>(occupant.flat_id);
  const [switchingFlat, setSwitchingFlat] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'help'>('dashboard');

  useEffect(() => {
    loadData();
  }, [occupant, selectedFlatId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all flats for this occupant
      if (occupant.all_flats && occupant.all_flats.length > 0) {
        setAllFlats(occupant.all_flats);
      }

      // Load payments for selected flat using RPC function
      const paymentsResult = await supabase.rpc('get_payments_for_flat_with_session', {
        session_token: occupant.sessionToken,
        flat_id: selectedFlatId
      });

      if (paymentsResult.data) {
        setPayments(paymentsResult.data);
      }

      // Load apartment info for selected flat from occupant's flat list
      const currentFlat = allFlats.find(f => f.flat_id === selectedFlatId) ||
                          occupant.all_flats?.find((f: any) => f.flat_id === selectedFlatId);

      if (currentFlat) {
        setApartmentInfo({
          apartment_name: currentFlat.apartment_name,
          block_name: currentFlat.block_name,
          flat_number: currentFlat.flat_number,
        });
      } else {
        // Fallback to direct query if not in flat list
        const infoResult = await supabase
          .from('flat_numbers')
          .select(
            `
            flat_number,
            buildings_blocks_phases!inner(
              block_name,
              apartments!inner(apartment_name)
            )
          `
          )
          .eq('id', selectedFlatId)
          .single();

        if (infoResult.data) {
          setApartmentInfo({
            apartment_name: (infoResult.data.buildings_blocks_phases as any).apartments.apartment_name,
            block_name: (infoResult.data.buildings_blocks_phases as any).block_name,
            flat_number: infoResult.data.flat_number,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlatSwitch = async (flatId: string) => {
    if (flatId === selectedFlatId) return;

    setSwitchingFlat(true);
    setSelectedFlatId(flatId);
    setSwitchingFlat(false);
  };

  const categories = ['all', ...new Set(payments.map((p) => p.payment_type))];

  const filteredPayments =
    selectedCategory === 'all'
      ? payments
      : payments.filter((p) => p.payment_type === selectedCategory);

  const totalPaid = payments
    .filter((p) => p.status === 'Approved')
    .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === 'Received' || p.status === 'Reviewed')
    .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Received':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Reviewed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Received':
        return <Clock className="w-4 h-4" />;
      case 'Reviewed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const exportToCSV = () => {
    const currentFlat = allFlats.find(f => f.flat_id === selectedFlatId);
    const flatLabel = currentFlat
      ? `${currentFlat.apartment_name}_${currentFlat.block_name}_Flat${currentFlat.flat_number}`
      : apartmentInfo?.flat_number || 'unknown';

    const headers = [
      'Date',
      'Payment Type',
      'Quarter',
      'Amount',
      'Platform',
      'Transaction Reference',
      'Status',
      'Comments',
    ];
    const rows = filteredPayments.map((payment) => [
      payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString()
        : new Date(payment.created_at).toLocaleDateString(),
      payment.payment_type,
      payment.payment_quarter,
      payment.payment_amount || 0,
      payment.platform || '',
      payment.transaction_reference || '',
      payment.status,
      payment.comments || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `payments_${flatLabel}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <div className="text-gray-600 text-lg">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <header className="bg-white shadow-md border-b-2 border-amber-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src="/AppLogo-FlatFund Pro.jpg"
                alt="FlatFund Pro"
                className="h-14 sm:h-16 lg:h-18 object-contain flex-shrink-0 drop-shadow-md"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Occupant Portal
                  <Home className="w-5 h-5 text-amber-600" />
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {apartmentInfo?.apartment_name} - {apartmentInfo?.block_name} - Flat{' '}
                  {apartmentInfo?.flat_number}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'help'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Help Center
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'help' ? (
          <HelpCenter />
        ) : (
          <>
        {allFlats.length > 1 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Flats</h2>
            <p className="text-sm text-gray-600 mb-4">
              You are registered in multiple flats. Select a flat to view its payment history.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allFlats.map((flat) => (
                <button
                  key={flat.flat_id}
                  onClick={() => handleFlatSwitch(flat.flat_id)}
                  disabled={switchingFlat}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedFlatId === flat.flat_id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <p className="font-semibold text-gray-900">
                    Flat {flat.flat_number}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {flat.apartment_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {flat.block_name}
                  </p>
                  {selectedFlatId === flat.flat_id && (
                    <p className="text-xs text-amber-600 font-medium mt-2">
                      Currently Viewing
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Occupant Type</p>
                <p className="font-medium text-gray-800">{occupant.occupant_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Flat Number</p>
                <p className="font-medium text-gray-800">{apartmentInfo?.flat_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-800">{occupant.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Mobile</p>
                <p className="font-medium text-gray-800">{occupant.mobile || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Total Paid</h3>
              <CheckCircle className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">₹{totalPaid.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">
              {payments.filter((p) => p.status === 'Approved').length} payments
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Pending</h3>
              <Clock className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">₹{totalPending.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">
              {payments.filter((p) => p.status === 'Received' || p.status === 'Reviewed').length} payments
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Total Payments</h3>
              <FileText className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{payments.length}</p>
            <p className="text-sm opacity-80 mt-1">All transactions</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-800">Transaction History</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm mt-2">
                  {selectedCategory === 'all'
                    ? 'You have not made any payments yet'
                    : 'No payments found for this category'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Quarter
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Transaction Ref
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {payment.payment_date
                              ? new Date(payment.payment_date).toLocaleDateString()
                              : new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{payment.payment_quarter}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {payment.payment_amount?.toLocaleString() || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{payment.platform || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            payment.status
                          )}`}
                        >
                          {getStatusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 font-mono">
                          {payment.transaction_reference || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
