import React, { useEffect, useState } from 'react';
import { Download, TrendingUp, DollarSign, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface MonthlyTrend {
  month: string;
  expected: number;
  collected: number;
  rate: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  amount: number;
}

interface Defaulter {
  flatNumber: string;
  outstandingAmount: number;
  paymentsCount: number;
  lastPaymentDate: string | null;
}

interface CollectionPerformance {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  monthlyTrends: MonthlyTrend[];
  paymentMethodDistribution: PaymentMethod[];
  topDefaulters: Defaulter[];
}

interface Props {
  buildingId: string;
}

export default function CollectionPerformanceDashboard({ buildingId }: Props) {
  const [data, setData] = useState<CollectionPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCollectionPerformance();
  }, [buildingId, dateRange]);

  const loadCollectionPerformance = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_collection_performance', {
        p_apartment_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading collection performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.monthlyTrends) return;
    exportToCSV(data.monthlyTrends, 'collection_performance');
  };

  const handleExportExcel = () => {
    if (!data?.monthlyTrends) return;
    exportToExcel(data.monthlyTrends, 'collection_performance');
  };

  const handleExportPDF = () => {
    exportToPDF('collection-performance-report', 'Collection Performance Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collection Performance</h2>
          <p className="text-gray-600 mt-1">Track collection efficiency and payment trends</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div id="collection-performance-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Expected</div>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.totalExpected)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Collected</div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totalCollected)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Outstanding</div>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.totalOutstanding)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Collection Rate</div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(data.collectionRate)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Collection Trends</h3>
          {data.monthlyTrends && data.monthlyTrends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Expected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Collected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTrends.map((trend, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{trend.month}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(trend.expected)}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {formatCurrency(trend.collected)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatPercentage(trend.rate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trend.rate >= 90 ? 'bg-green-100 text-green-800' :
                          trend.rate >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {trend.rate >= 90 ? 'Excellent' :
                           trend.rate >= 75 ? 'Good' : 'Poor'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available for this period</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method Distribution</h3>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">What is this?</p>
                  <p className="text-blue-800">
                    Shows breakdown of payment methods (UPI, Bank Transfer, Check, Cash, etc.) from the
                    <span className="font-semibold"> payment_source</span> field. This data is auto-populated
                    when payments are imported via automation or entered by admins. Manual occupant submissions
                    without this field will show as "Not Specified".
                  </p>
                </div>
              </div>
            </div>
            {data.paymentMethodDistribution && data.paymentMethodDistribution.length > 0 ? (
              <div className="space-y-3">
                {data.paymentMethodDistribution.map((method, index) => {
                  const total = data.paymentMethodDistribution.reduce((sum, m) => sum + m.amount, 0);
                  const percentage = total > 0 ? (method.amount / total) * 100 : 0;
                  const displayMethod = method.method || 'Not Specified';
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {displayMethod}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(method.amount)} ({method.count})
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            displayMethod === 'Not Specified' ? 'bg-gray-400' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No payment data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Defaulters</h3>
            {data.topDefaulters && data.topDefaulters.length > 0 ? (
              <div className="space-y-3">
                {data.topDefaulters.map((defaulter, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-gray-900">{defaulter.flatNumber}</div>
                      <div className="text-sm text-gray-600">
                        {defaulter.paymentsCount} payment{defaulter.paymentsCount !== 1 ? 's' : ''}
                        {defaulter.lastPaymentDate && (
                          <> • Last: {new Date(defaulter.lastPaymentDate).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        {formatCurrency(defaulter.outstandingAmount)}
                      </div>
                      <div className="text-xs text-gray-600">Outstanding</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">No outstanding payments!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
