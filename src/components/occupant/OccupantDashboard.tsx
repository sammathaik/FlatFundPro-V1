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
  Bell,
  MessageCircle,
  Info,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HelpCenter from './HelpCenter';
import ChatBot from '../ChatBot';
import OccupantProfile from './OccupantProfile';
import PendingPayments from './PendingPayments';
import QuickPaymentModal from './QuickPaymentModal';

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
  amount_due: number | null;
  collection_name: string | null;
  payment_frequency: string | null;
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'pending' | 'help'>('dashboard');
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [flatEmail, setFlatEmail] = useState<string>(occupant.email);

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

      // Load WhatsApp opt-in preference and flat's registered email
      const { data: flatMapping } = await supabase
        .from('flat_email_mappings')
        .select('whatsapp_opt_in, email')
        .eq('flat_id', selectedFlatId)
        .eq('mobile', occupant.mobile)
        .maybeSingle();

      if (flatMapping) {
        setWhatsappOptIn(flatMapping.whatsapp_opt_in || false);
        setFlatEmail(flatMapping.email || occupant.email);
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

  const handleWhatsAppOptInToggle = async () => {
    setUpdatingPreferences(true);
    try {
      const newOptInValue = !whatsappOptIn;

      const { error } = await supabase
        .from('flat_email_mappings')
        .update({ whatsapp_opt_in: newOptInValue })
        .eq('flat_id', selectedFlatId)
        .eq('email', occupant.email);

      if (error) {
        console.error('Error updating WhatsApp preference:', error);
        alert('Failed to update notification preferences. Please try again.');
      } else {
        setWhatsappOptIn(newOptInValue);
      }
    } catch (error) {
      console.error('Error updating WhatsApp preference:', error);
      alert('Failed to update notification preferences. Please try again.');
    } finally {
      setUpdatingPreferences(false);
    }
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
      'Collection Name',
      'Payment Type',
      'Frequency',
      'Amount Due',
      'Amount Paid',
      'Platform',
      'Transaction Reference',
      'Status',
      'Comments',
    ];
    const rows = filteredPayments.map((payment) => [
      payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString()
        : new Date(payment.created_at).toLocaleDateString(),
      payment.collection_name || payment.payment_quarter || '-',
      payment.payment_type,
      payment.payment_frequency || 'quarterly',
      payment.amount_due || '-',
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <div className="text-gray-600 text-lg">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <header className="bg-white shadow-md border-b-2 border-blue-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src="/flatfundpro-2-logo.jpeg"
                alt="FlatFund Pro"
                className="h-14 sm:h-16 lg:h-18 object-contain flex-shrink-0 drop-shadow-md"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  Occupant Portal
                  <Home className="w-5 h-5 text-blue-600" />
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

          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Pending Payments
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === 'help'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
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
        ) : activeTab === 'pending' ? (
          <PendingPayments
            flatId={selectedFlatId}
            email={flatEmail}
            mobile={occupant.mobile}
            onPayNow={(collection) => {
              setSelectedCollection(collection);
              setShowPaymentModal(true);
            }}
          />
        ) : activeTab === 'profile' ? (
          <OccupantProfile
            occupant={occupant}
            apartmentInfo={apartmentInfo}
            onProfileUpdate={loadData}
          />
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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
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
                    <p className="text-xs text-blue-600 font-medium mt-2">
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

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Notification Preferences</h2>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <MessageCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">WhatsApp Payment Reminders</h3>
                    {whatsappOptIn && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Receive automated WhatsApp reminders at 7 days, 3 days, and 1 day before payment due dates.
                    {!occupant.mobile && (
                      <span className="block mt-2 text-amber-600 font-medium">
                        Note: Please provide your mobile number in the payment form to receive WhatsApp notifications.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleWhatsAppOptInToggle}
                disabled={updatingPreferences || !occupant.mobile}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  whatsappOptIn ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    whatsappOptIn ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
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

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      Collection
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1 group relative">
                        <span>Frequency</span>
                        <Info className="w-3 h-3 text-gray-400" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                          Monthly, Quarterly, or One-time collection
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1 group relative">
                        <span>Amount Due</span>
                        <Info className="w-3 h-3 text-gray-400" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                          Expected contribution as per collection
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-1 group relative">
                        <span>Amount Paid</span>
                        <Info className="w-3 h-3 text-gray-400" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
                          Your actual payment amount
                        </div>
                      </div>
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
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {payment.collection_name || payment.payment_quarter || '-'}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
                          {payment.payment_frequency || 'Quarterly'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {payment.amount_due ? payment.amount_due.toLocaleString() : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-bold text-green-700">
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

      {/* Occupant Chatbot */}
      <ChatBot userRole="occupant" userId={occupant.user_id} apartmentId={apartmentInfo?.apartment_id} />

      {/* Quick Payment Modal */}
      <QuickPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCollection(null);
        }}
        collection={selectedCollection}
        flatId={selectedFlatId}
        apartmentId={apartmentInfo?.apartment_id || occupant.apartment_id}
        blockId={occupant.block_id || (allFlats.find(f => f.flat_id === selectedFlatId)?.block_id)}
        flatEmail={flatEmail}
        occupantMobile={occupant.mobile}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
