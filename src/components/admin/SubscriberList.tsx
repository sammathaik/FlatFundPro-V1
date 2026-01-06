import { useState, useEffect, useMemo } from 'react';
import { Users, Download, FileSpreadsheet, Search, Filter, ChevronLeft, ChevronRight, Building, User, Mail, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel, formatDate } from '../../lib/exportUtils';

interface Subscriber {
  id: string;
  apartment_id: string;
  apartment_name: string;
  block_id: string;
  block_name: string;
  flat_id: string;
  flat_number: string;
  name: string | null;
  email: string;
  mobile: string | null;
  occupant_type: 'Owner' | 'Tenant';
  whatsapp_opt_in: boolean;
  mapped_at: string;
  last_active_date: string | null;
}

export default function SubscriberList() {
  const { adminData } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlock, setFilterBlock] = useState<string>('all');
  const [filterOccupantType, setFilterOccupantType] = useState<string>('all');
  const [filterOptIn, setFilterOptIn] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [blocks, setBlocks] = useState<{ id: string; block_name: string }[]>([]);

  useEffect(() => {
    if (adminData?.apartment_id) {
      loadSubscribers();
      loadBlocks();
    }
  }, [adminData?.apartment_id]);

  const loadBlocks = async () => {
    if (!adminData?.apartment_id) return;

    const { data, error } = await supabase
      .from('buildings_blocks_phases')
      .select('id, block_name')
      .eq('apartment_id', adminData.apartment_id)
      .order('block_name');

    if (error) {
      console.error('Error loading blocks:', error);
      return;
    }

    setBlocks(data || []);
  };

  const loadSubscribers = async () => {
    if (!adminData?.apartment_id) return;

    setLoading(true);

    try {
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('flat_email_mappings')
        .select(`
          id,
          apartment_id,
          block_id,
          flat_id,
          email,
          mobile,
          name,
          occupant_type,
          whatsapp_opt_in,
          mapped_at,
          apartments!inner(apartment_name),
          buildings_blocks_phases!inner(block_name),
          flat_numbers!inner(flat_number)
        `)
        .eq('apartment_id', adminData.apartment_id)
        .order('block_name', { foreignTable: 'buildings_blocks_phases' })
        .order('flat_number', { foreignTable: 'flat_numbers' });

      if (mappingsError) throw mappingsError;

      const flatIds = mappingsData?.map(m => m.flat_id) || [];

      let lastActiveDates: Record<string, string> = {};

      if (flatIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payment_submissions')
          .select('flat_id, payment_date, created_at')
          .in('flat_id', flatIds)
          .order('payment_date', { ascending: false });

        if (paymentsData) {
          const grouped = paymentsData.reduce((acc, payment) => {
            if (!acc[payment.flat_id]) {
              acc[payment.flat_id] = payment.payment_date || payment.created_at;
            }
            return acc;
          }, {} as Record<string, string>);

          lastActiveDates = grouped;
        }
      }

      const formattedSubscribers: Subscriber[] = (mappingsData || []).map((mapping: any) => ({
        id: mapping.id,
        apartment_id: mapping.apartment_id,
        apartment_name: mapping.apartments.apartment_name,
        block_id: mapping.block_id,
        block_name: mapping.buildings_blocks_phases.block_name,
        flat_id: mapping.flat_id,
        flat_number: mapping.flat_numbers.flat_number,
        name: mapping.name,
        email: mapping.email,
        mobile: mapping.mobile,
        occupant_type: mapping.occupant_type,
        whatsapp_opt_in: mapping.whatsapp_opt_in || false,
        mapped_at: mapping.mapped_at,
        last_active_date: lastActiveDates[mapping.flat_id] || mapping.mapped_at,
      }));

      setSubscribers(formattedSubscribers);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(subscriber => {
      const matchesSearch =
        searchTerm === '' ||
        subscriber.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.flat_number.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBlock = filterBlock === 'all' || subscriber.block_id === filterBlock;
      const matchesOccupantType = filterOccupantType === 'all' || subscriber.occupant_type === filterOccupantType;
      const matchesOptIn =
        filterOptIn === 'all' ||
        (filterOptIn === 'yes' && subscriber.whatsapp_opt_in) ||
        (filterOptIn === 'no' && !subscriber.whatsapp_opt_in);

      return matchesSearch && matchesBlock && matchesOccupantType && matchesOptIn;
    });
  }, [subscribers, searchTerm, filterBlock, filterOccupantType, filterOptIn]);

  const paginatedSubscribers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSubscribers.slice(startIndex, endIndex);
  }, [filteredSubscribers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSubscribers.length / pageSize);

  const handleExportExcel = () => {
    const exportData = filteredSubscribers.map(sub => ({
      'Building/Block': sub.block_name,
      'Flat Number': sub.flat_number,
      'Name': sub.name || '-',
      'Mobile Number': sub.mobile || '-',
      'Email Address': sub.email,
      'WhatsApp Opt-In': sub.whatsapp_opt_in ? 'Yes' : 'No',
      'Occupant Type': sub.occupant_type,
      'Last Active': formatDate(sub.last_active_date || sub.mapped_at),
    }));

    exportToExcel(exportData, `Subscriber_List_${adminData?.apartment?.apartment_name || 'Export'}`);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subscriber List - ${adminData?.apartment?.apartment_name || 'FlatFund Pro'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #1e40af;
            margin-bottom: 10px;
          }
          .meta {
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th {
            background-color: #1e40af;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .opt-in-yes {
            color: #059669;
            font-weight: bold;
          }
          .opt-in-no {
            color: #dc2626;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Subscriber List</h1>
        <div class="meta">
          <strong>${adminData?.apartment?.apartment_name || 'FlatFund Pro'}</strong><br/>
          Generated on: ${new Date().toLocaleString()}<br/>
          Total Subscribers: ${filteredSubscribers.length}
        </div>
        <table>
          <thead>
            <tr>
              <th>Building/Block</th>
              <th>Flat</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Type</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSubscribers.map(sub => `
              <tr>
                <td>${sub.block_name}</td>
                <td>${sub.flat_number}</td>
                <td>${sub.name || '-'}</td>
                <td>${sub.mobile || '-'}</td>
                <td>${sub.email}</td>
                <td class="${sub.whatsapp_opt_in ? 'opt-in-yes' : 'opt-in-no'}">${sub.whatsapp_opt_in ? 'Yes' : 'No'}</td>
                <td>${sub.occupant_type}</td>
                <td>${formatDate(sub.last_active_date || sub.mapped_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 100);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscribers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Subscriber List</h2>
              <p className="text-sm text-gray-600">All owners and tenants across your apartment</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, mobile, or flat..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={filterBlock}
            onChange={(e) => {
              setFilterBlock(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Buildings</option>
            {blocks.map(block => (
              <option key={block.id} value={block.id}>{block.block_name}</option>
            ))}
          </select>

          <select
            value={filterOccupantType}
            onChange={(e) => {
              setFilterOccupantType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="Owner">Owner</option>
            <option value="Tenant">Tenant</option>
          </select>

          <select
            value={filterOptIn}
            onChange={(e) => {
              setFilterOptIn(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All WhatsApp Status</option>
            <option value="yes">Opted In</option>
            <option value="no">Not Opted In</option>
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-blue-900 font-medium">
              Showing {paginatedSubscribers.length} of {filteredSubscribers.length} subscribers
              {filteredSubscribers.length !== subscribers.length && ` (filtered from ${subscribers.length} total)`}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-900 font-medium">Per page:</span>
              {[25, 50, 100].map(size => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    pageSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-900 hover:bg-blue-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Building/Block
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Flat
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  WhatsApp Opt-In
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedSubscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      {subscriber.block_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {subscriber.flat_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {subscriber.name || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subscriber.mobile ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {subscriber.mobile}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate max-w-xs" title={subscriber.email}>
                        {subscriber.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {subscriber.whatsapp_opt_in ? (
                      <div className="flex items-center gap-1 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Yes</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-500">
                        <XCircle className="w-4 h-4" />
                        <span>No</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        subscriber.occupant_type === 'Owner'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {subscriber.occupant_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(subscriber.last_active_date || subscriber.mapped_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedSubscribers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No subscribers found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search terms</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
