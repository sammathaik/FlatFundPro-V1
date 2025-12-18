import React, { useEffect, useState } from 'react';
import { Download, Search, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatDate, formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface FlatPayment {
  flatId: string;
  flatNumber: string;
  ownerName: string;
  occupantType: string;
  totalExpected: number;
  totalPaid: number;
  outstanding: number;
  paymentCount: number;
  avgPaymentDelay: number;
  lastPaymentDate: string | null;
  consistencyScore: number;
  preferredMethod: string;
}

interface Props {
  buildingId: string;
}

export default function FlatPaymentHistory({ buildingId }: Props) {
  const [data, setData] = useState<FlatPayment[]>([]);
  const [filteredData, setFilteredData] = useState<FlatPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof FlatPayment>('flatNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadFlatPaymentHistory();
  }, [buildingId]);

  useEffect(() => {
    filterAndSort();
  }, [data, searchTerm, sortField, sortDirection]);

  const loadFlatPaymentHistory = async () => {
    try {
      setLoading(true);
      console.log('Loading flat payment history for apartment:', buildingId);
      const { data: result, error } = await supabase.rpc('get_flat_payment_history', {
        p_apartment_id: buildingId
      });

      if (error) {
        console.error('Error from RPC:', error);
        throw error;
      }
      console.log('Flat payment history result:', result);
      setData(result || []);
    } catch (error) {
      console.error('Error loading flat payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSort = () => {
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(flat =>
        flat.flatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flat.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal > bVal ? 1 : -1)
        : (aVal < bVal ? 1 : -1);
    });

    setFilteredData(filtered);
  };

  const handleSort = (field: keyof FlatPayment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const exportData = filteredData.map(flat => ({
      'Flat Number': flat.flatNumber,
      'Resident Name': flat.ownerName,
      'Type': flat.occupantType,
      'Total Expected': flat.totalExpected,
      'Total Paid': flat.totalPaid,
      'Outstanding': flat.outstanding,
      'Payments': flat.paymentCount,
      'Avg Delay (days)': flat.avgPaymentDelay,
      'Last Payment': flat.lastPaymentDate ? formatDate(flat.lastPaymentDate) : 'N/A',
      'Consistency Score': flat.consistencyScore,
      'Preferred Method': flat.preferredMethod || 'N/A'
    }));
    exportToCSV(exportData, 'flat_payment_history');
  };

  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const exportData = filteredData.map(flat => ({
      'Flat Number': flat.flatNumber,
      'Resident Name': flat.ownerName,
      'Type': flat.occupantType,
      'Total Expected': flat.totalExpected,
      'Total Paid': flat.totalPaid,
      'Outstanding': flat.outstanding,
      'Payments': flat.paymentCount,
      'Avg Delay (days)': flat.avgPaymentDelay,
      'Last Payment': flat.lastPaymentDate ? formatDate(flat.lastPaymentDate) : 'N/A',
      'Consistency Score': flat.consistencyScore,
      'Preferred Method': flat.preferredMethod || 'N/A'
    }));
    exportToExcel(exportData, 'flat_payment_history');
  };

  const handleExportPDF = () => {
    exportToPDF('flat-payment-history-report', 'Flat Payment History Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Flat-wise Payment History</h2>
          <p className="text-gray-600 mt-1">Detailed payment analysis for each flat</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 no-print"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by flat number or owner name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Flats</div>
          <div className="text-2xl font-bold text-gray-900">{data.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Average Consistency</div>
          <div className="text-2xl font-bold text-blue-600">
            {data.length > 0
              ? formatPercentage(data.reduce((sum, f) => sum + f.consistencyScore, 0) / data.length)
              : '0%'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(data.reduce((sum, f) => sum + f.outstanding, 0))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Average Delay</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.length > 0
              ? `${(data.reduce((sum, f) => sum + (f.avgPaymentDelay || 0), 0) / data.length).toFixed(1)} days`
              : '0 days'}
          </div>
        </div>
      </div>

      <div id="flat-payment-history-report" className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('flatNumber')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Flat {sortField === 'flatNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('ownerName')}
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Owner {sortField === 'ownerName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th
                  onClick={() => handleSort('totalPaid')}
                  className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Paid {sortField === 'totalPaid' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('outstanding')}
                  className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Outstanding {sortField === 'outstanding' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Payments</th>
                <th
                  onClick={() => handleSort('consistencyScore')}
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                >
                  Score {sortField === 'consistencyScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Avg Delay</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((flat) => (
                <tr key={flat.flatId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{flat.flatNumber}</td>
                  <td className="py-3 px-4 text-gray-700">{flat.ownerName}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {flat.occupantType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">
                    {formatCurrency(flat.totalPaid)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {flat.outstanding > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {formatCurrency(flat.outstanding)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">{flat.paymentCount}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`font-semibold ${
                        flat.consistencyScore >= 90 ? 'text-green-600' :
                        flat.consistencyScore >= 75 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {flat.consistencyScore.toFixed(0)}%
                      </div>
                      {flat.consistencyScore >= 90 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : flat.consistencyScore < 75 ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {flat.avgPaymentDelay ? `${flat.avgPaymentDelay.toFixed(1)}d` : '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-700 capitalize">
                    {flat.preferredMethod || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No flats found matching your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
