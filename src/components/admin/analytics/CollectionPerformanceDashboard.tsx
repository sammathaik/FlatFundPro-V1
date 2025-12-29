import React, { useEffect, useState } from 'react';
import { Download, TrendingUp, AlertCircle, Info, Coins, TrendingDown } from 'lucide-react';
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

interface CollectionTypePerformance {
  type: string;
  expected: number;
  collected: number;
  rate: number;
  flatCount: number;
}

interface CollectionPerformance {
  flatCount: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  collectionTypePerformance: CollectionTypePerformance[];
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
          <p className="text-gray-600 mt-1">Track collection efficiency and payment trends for {data.flatCount} flats</p>
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
        {/* Key Metrics with Tooltips */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Expected */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">Total Expected</div>
                <div className="text-xs text-blue-700 leading-tight">
                  Sum of all expected collections for selected period
                </div>
              </div>
              <Coins className="w-6 h-6 text-blue-600 flex-shrink-0" />
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrency(data.totalExpected)}
            </div>
            <div className="mt-2 text-xs text-blue-700 bg-blue-200 bg-opacity-50 rounded px-2 py-1">
              Based on expected_collections table
            </div>
          </div>

          {/* Total Collected */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border border-green-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-green-900 mb-1">Total Collected</div>
                <div className="text-xs text-green-700 leading-tight">
                  Sum of all verified payments received
                </div>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0" />
            </div>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(data.totalCollected)}
            </div>
            <div className="mt-2 text-xs text-green-700 bg-green-200 bg-opacity-50 rounded px-2 py-1">
              Only verified payments counted
            </div>
          </div>

          {/* Outstanding */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6 border border-indigo-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-orange-900 mb-1">Outstanding</div>
                <div className="text-xs text-indigo-700 leading-tight">
                  Expected amount minus collected amount
                </div>
              </div>
              <TrendingDown className="w-6 h-6 text-indigo-600 flex-shrink-0" />
            </div>
            <div className="text-3xl font-bold text-orange-900">
              {formatCurrency(data.totalOutstanding)}
            </div>
            <div className="mt-2 text-xs text-indigo-700 bg-indigo-200 bg-opacity-50 rounded px-2 py-1">
              Pending collections to receive
            </div>
          </div>

          {/* Collection Rate */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-6 border border-purple-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-purple-900 mb-1">Collection Rate</div>
                <div className="text-xs text-purple-700 leading-tight">
                  Percentage of expected amount collected
                </div>
              </div>
              <div className="flex-shrink-0">
                {data.collectionRate >= 90 ? (
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                )}
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {formatPercentage(data.collectionRate)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                data.collectionRate >= 90 ? 'bg-green-200 text-green-800' :
                data.collectionRate >= 75 ? 'bg-yellow-200 text-yellow-800' :
                'bg-red-200 text-red-800'
              }`}>
                {data.collectionRate >= 90 ? 'Excellent' :
                 data.collectionRate >= 75 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>
        </div>

        {/* Collection Type Performance */}
        {data.collectionTypePerformance && data.collectionTypePerformance.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance by Collection Type</h3>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Collection Type Breakdown:</p>
                  <p className="text-blue-800 leading-relaxed">
                    Shows how each maintenance category (Type A, B, C) is performing. Each type has its own expected amount per flat across all {data.flatCount} flats.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.collectionTypePerformance.map((type, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full font-semibold text-sm">
                      Type {type.type}
                    </span>
                    <span className={`text-sm font-bold ${
                      type.rate >= 90 ? 'text-green-600' :
                      type.rate >= 75 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(type.rate)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(type.expected)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collected:</span>
                      <span className="font-semibold text-green-700">{formatCurrency(type.collected)}</span>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-300 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        type.rate >= 90 ? 'bg-green-600' :
                        type.rate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(type.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Collection Trends</h3>
            <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Understanding this report:</p>
                <ul className="text-gray-600 space-y-1 list-disc list-inside">
                  <li><span className="font-semibold">Expected:</span> Total amount due from all flats in that month (from expected_collections)</li>
                  <li><span className="font-semibold">Collected:</span> Total verified payments received in that month</li>
                  <li><span className="font-semibold">Rate:</span> Collection efficiency = (Collected / Expected) × 100</li>
                  <li><span className="font-semibold">Status:</span> Excellent (90%+), Good (75-89%), Poor (below 75%)</li>
                </ul>
              </div>
            </div>
          </div>
          {data.monthlyTrends && data.monthlyTrends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Expected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Collected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyTrends.map((trend, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{trend.month}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(trend.expected)}</td>
                      <td className="py-3 px-4 text-right text-green-700 font-semibold">
                        {formatCurrency(trend.collected)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {formatPercentage(trend.rate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          trend.rate >= 90 ? 'bg-green-100 text-green-800 border border-green-300' :
                          trend.rate >= 75 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-red-100 text-red-800 border border-red-300'
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method Distribution</h3>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">What is this?</p>
                  <p className="text-blue-800 leading-relaxed">
                    Shows breakdown of payment methods (UPI, Bank Transfer, Check, Cash, etc.) from the
                    <span className="font-semibold"> payment_source</span> field. This data is auto-populated
                    when payments are imported via automation or entered by admins. Manual occupant submissions
                    without this field will show as "Not Specified".
                  </p>
                </div>
              </div>
            </div>
            {data.paymentMethodDistribution && data.paymentMethodDistribution.length > 0 ? (
              <div className="space-y-4">
                {data.paymentMethodDistribution.map((method, index) => {
                  const total = data.paymentMethodDistribution.reduce((sum, m) => sum + m.amount, 0);
                  const percentage = total > 0 ? (method.amount / total) * 100 : 0;
                  const displayMethod = method.method || 'Not Specified';
                  return (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900 capitalize">
                          {displayMethod}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(method.amount)} <span className="text-gray-500">({method.count})</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-3 shadow-inner">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            displayMethod === 'Not Specified' ? 'bg-gray-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-600 text-right">
                        {percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No payment data available</p>
            )}
          </div>

          {/* Top Defaulters */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Defaulters</h3>
              <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-medium mb-1">What is this?</p>
                  <p className="text-indigo-800 leading-relaxed">
                    Lists flats with the highest outstanding amounts (Expected - Collected) for the selected period.
                    Shows payment count and last payment date to help identify follow-up priorities.
                  </p>
                </div>
              </div>
            </div>
            {data.topDefaulters && data.topDefaulters.length > 0 ? (
              <div className="space-y-3">
                {data.topDefaulters.map((defaulter, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                        index === 0 ? 'bg-red-600' : index === 1 ? 'bg-red-500' : 'bg-red-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{defaulter.flatNumber}</div>
                        <div className="text-xs text-gray-600">
                          {defaulter.paymentsCount} payment{defaulter.paymentsCount !== 1 ? 's' : ''}
                          {defaulter.lastPaymentDate && (
                            <> • Last: {new Date(defaulter.lastPaymentDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-700 text-lg">
                        {formatCurrency(defaulter.outstandingAmount)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Outstanding</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-700">Excellent!</p>
                <p className="text-gray-600 mt-1">No outstanding payments in this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
