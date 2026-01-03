import { useState, useEffect } from 'react';
import { Download, Loader2, Eye, Search, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToCSV, logAudit, formatDateTime, formatDate } from '../../lib/utils';

interface PaymentWithDetails {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  transaction_reference: string | null;
  payment_quarter: string | null;
  comments: string | null;
  screenshot_url: string;
  status: string;
  created_at: string;
  apartment: { apartment_name: string };
  block: { block_name: string };
  flat: { flat_number: string };
}

export default function AllPaymentsView() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quarterFilter, setQuarterFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, quarterFilter]);

  async function loadPayments() {
    try {
      const { data, error } = await supabase
        .from('payment_submissions')
        .select(`
          *,
          apartment:apartments(apartment_name),
          block:buildings_blocks_phases(block_name),
          flat:flat_numbers(flat_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterPayments() {
    let filtered = [...payments];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.apartment?.apartment_name.toLowerCase().includes(term) ||
          p.flat?.flat_number.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (quarterFilter !== 'all') {
      filtered = filtered.filter((p) => p.payment_quarter === quarterFilter);
    }

    setFilteredPayments(filtered);
  }

  function handleExport() {
    const exportData = filteredPayments.map((payment) => ({
      apartment: payment.apartment?.apartment_name || '',
      building_block: payment.block?.block_name || '',
      flat_number: payment.flat?.flat_number || '',
      name: payment.name,
      email: payment.email,
      contact_number: payment.contact_number || '',
      payment_amount: payment.payment_amount || '',
      payment_date: payment.payment_date || '',
      transaction_reference: payment.transaction_reference || '',
      quarter: payment.payment_quarter || '',
      comments: payment.comments || '',
      status: payment.status,
      submitted_at: payment.created_at,
      screenshot_url: payment.screenshot_url,
    }));

    exportToCSV(exportData, 'all_payments');
    logAudit('export', 'payment_submissions', undefined, { count: exportData.length });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Payment Submissions</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Read-only view of all payments across apartments</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, apartment, or flat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Quarters</option>
            {Array.from(new Set(payments.map(p => p.payment_quarter).filter(Boolean))).sort().reverse().map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        <div className="sm:w-48 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Status</option>
            <option value="Received">Received</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
        <p className="text-sm text-blue-800">
          Showing {filteredPayments.length} of {payments.length} payment submissions
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Apartment
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Location
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Amount
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Quarter
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Payment Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {payment.apartment?.apartment_name}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {payment.block?.block_name} - {payment.flat?.flat_number}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{payment.name}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{payment.email}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {payment.payment_amount ? `₹${payment.payment_amount.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {payment.payment_quarter || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          payment.status === 'Approved'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Reviewed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {payment.payment_date ? formatDate(payment.payment_date) : formatDateTime(payment.created_at)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payment submissions found matching your criteria.
          </div>
        )}
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Apartment</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.apartment?.apartment_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.block?.block_name} - {selectedPayment.flat?.flat_number}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Contact</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.contact_number || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Amount</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.payment_amount ? `₹${selectedPayment.payment_amount.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Payment Date</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {selectedPayment.payment_date || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Transaction Ref</label>
                  <p className="text-sm font-medium text-gray-900 mt-1 font-mono">
                    {selectedPayment.transaction_reference || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Quarter</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.payment_quarter || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Submitted On</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDateTime(selectedPayment.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedPayment.status}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Comments</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200 min-h-[60px]">
                  {selectedPayment.comments || 'No comments'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                  Payment Screenshot
                </label>
                <a
                  href={selectedPayment.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Screenshot →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
