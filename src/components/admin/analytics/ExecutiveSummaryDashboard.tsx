import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, Clock, Download, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface CollectionTypeBreakdown {
  type: string;
  perFlatAmount: number;
  flatCount: number;
  totalExpected: number;
  totalCollected: number;
  outstanding: number;
  collectionRate: number;
}

interface RecentPayment {
  date: string;
  amount: number;
  flatNumber: string;
  collectionType: string;
  source: string;
}

interface TopDefaulter {
  flatNumber: string;
  outstandingAmount: number;
  collectionTypes: string[];
  lastPaymentDate: string | null;
}

interface ExecutiveSummary {
  flatCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  overallCollectionRate: number;
  collectionTypeBreakdown: CollectionTypeBreakdown[];
  recentPayments: RecentPayment[];
  topDefaulters: TopDefaulter[];
}

interface Props {
  buildingId: string;
}

export default function ExecutiveSummaryDashboard({ buildingId }: Props) {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExecutiveSummary();
  }, [buildingId, dateRange]);

  const loadExecutiveSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_executive_summary', {
        p_apartment_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error loading executive summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!summary?.collectionTypeBreakdown) return;
    exportToCSV(summary.collectionTypeBreakdown, 'executive_summary');
  };

  const handleExportExcel = () => {
    if (!summary?.collectionTypeBreakdown) return;
    exportToExcel(summary.collectionTypeBreakdown, 'executive_summary');
  };

  const handleExportPDF = () => {
    exportToPDF('executive-summary-report', 'Executive Summary Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>Unable to load executive summary</p>
        <button
          onClick={loadExecutiveSummary}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
          <p className="text-gray-600 mt-1">Overview of collection performance for {summary.flatCount} flats</p>
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

      <div id="executive-summary-report" className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">Total Flats</div>
                <div className="text-xs text-blue-700">Configured in building</div>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900">{summary.flatCount}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-green-900 mb-1">Total Expected</div>
                <div className="text-xs text-green-700">For selected period</div>
              </div>
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900">{formatCurrency(summary.totalExpected)}</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-md p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-emerald-900 mb-1">Total Collected</div>
                <div className="text-xs text-emerald-700">Verified payments only</div>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-900">{formatCurrency(summary.totalCollected)}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-orange-900 mb-1">Outstanding</div>
                <div className="text-xs text-orange-700">Pending collections</div>
              </div>
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-orange-900">{formatCurrency(summary.totalOutstanding)}</div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Collection Rate</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className={`h-6 rounded-full transition-all duration-500 ${
                    summary.overallCollectionRate >= 90 ? 'bg-green-600' :
                    summary.overallCollectionRate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(summary.overallCollectionRate, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 min-w-[100px] text-right">
              {formatPercentage(summary.overallCollectionRate)}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            <strong>{formatCurrency(summary.totalCollected)}</strong> collected out of <strong>{formatCurrency(summary.totalExpected)}</strong> expected
          </p>
        </div>

        {/* Collection Type Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Collection Type Breakdown</h3>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Understanding Collection Types:</p>
                <p className="text-blue-800 leading-relaxed">
                  Types A, B, and C represent different maintenance categories (e.g., general maintenance, sinking fund, special charges).
                  Each flat is expected to pay all active collection types. The per-flat amount × {summary.flatCount} flats = total expected for each type.
                </p>
              </div>
            </div>
          </div>
          {summary.collectionTypeBreakdown && summary.collectionTypeBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Per Flat</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Expected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Collected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Outstanding</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.collectionTypeBreakdown.map((type, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                          Type {type.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(type.perFlatAmount)}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(type.totalExpected)}</td>
                      <td className="py-3 px-4 text-right text-green-700 font-semibold">{formatCurrency(type.totalCollected)}</td>
                      <td className="py-3 px-4 text-right text-orange-700 font-medium">{formatCurrency(type.outstanding)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          type.collectionRate >= 90 ? 'bg-green-100 text-green-800 border border-green-300' :
                          type.collectionRate >= 75 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {formatPercentage(type.collectionRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(summary.totalExpected)}</td>
                    <td className="py-3 px-4 text-right text-green-700">{formatCurrency(summary.totalCollected)}</td>
                    <td className="py-3 px-4 text-right text-orange-700">{formatCurrency(summary.totalOutstanding)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatPercentage(summary.overallCollectionRate)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No collection type data available</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
            {summary.recentPayments && summary.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {summary.recentPayments.slice(0, 5).map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <Clock className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{payment.flatNumber} - Type {payment.collectionType}</div>
                        <div className="text-xs text-gray-600">
                          {new Date(payment.date).toLocaleDateString()} • {payment.source || 'Manual'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">{formatCurrency(payment.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent payments</p>
            )}
          </div>

          {/* Top Defaulters */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Defaulters</h3>
            {summary.topDefaulters && summary.topDefaulters.length > 0 ? (
              <div className="space-y-3">
                {summary.topDefaulters.slice(0, 5).map((defaulter, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                        index === 0 ? 'bg-red-600' : index === 1 ? 'bg-red-500' : 'bg-red-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{defaulter.flatNumber}</div>
                        <div className="text-xs text-gray-600">
                          Types: {defaulter.collectionTypes.join(', ')}
                          {defaulter.lastPaymentDate && (
                            <> • Last: {new Date(defaulter.lastPaymentDate).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-700 text-lg">{formatCurrency(defaulter.outstandingAmount)}</div>
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
