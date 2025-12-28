import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2, Users, Home, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, CheckCircle, Activity, Calendar, CreditCard,
  BarChart3, PieChart, Shield, Target, Clock
} from 'lucide-react';

interface ExecutiveSummaryData {
  dateRange: {
    start: string;
    end: string;
  };
  platformStats: {
    totalApartments: number;
    totalBuildingsBlocks: number;
    totalFlats: number;
    totalAdmins: number;
    totalOccupants: number;
  };
  financialOverview: {
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
    totalPaymentsCount: number;
    pendingApprovals: number;
    averagePaymentAmount: number;
  };
  growthMetrics: {
    newApartments30Days: number;
    newApartments90Days: number;
    activeApartments: number;
  };
  monthlyTrends: Array<{
    month: string;
    monthStart: string;
    paymentCount: number;
    totalAmount: number;
  }>;
  topPerformers: Array<{
    apartmentName: string;
    city: string;
    flatCount: number;
    collectedAmount: number;
    expectedAmount: number;
    collectionRate: number;
    paymentCount: number;
  }>;
  underperformers: Array<{
    apartmentName: string;
    city: string;
    flatCount: number;
    collectedAmount: number;
    expectedAmount: number;
    outstanding: number;
    collectionRate: number;
    lastPaymentDate: string | null;
  }>;
  recentPayments: Array<{
    paymentDate: string;
    amount: number;
    source: string;
    apartmentName: string;
    blockName: string;
    flatNumber: string;
    collectionName: string;
  }>;
  paymentSourceDistribution: Array<{
    source: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
  fraudDetectionStats: {
    totalFraudDetected: number;
    flaggedPayments: number;
    rejectedPayments: number;
  };
}

export default function SuperAdminExecutiveSummary() {
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '12m' | 'all'>('12m');

  useEffect(() => {
    fetchExecutiveSummary();
  }, [dateRange]);

  const getDateRange = () => {
    const endDate = new Date().toISOString().split('T')[0];
    let startDate: string;

    switch (dateRange) {
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '12m':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'all':
        startDate = '2020-01-01'; // Far back date
        break;
      default:
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { startDate, endDate };
  };

  const fetchExecutiveSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange();

      const { data: result, error: rpcError } = await supabase.rpc(
        'get_super_admin_executive_summary',
        {
          p_start_date: startDate,
          p_end_date: endDate
        }
      );

      if (rpcError) throw rpcError;

      setData(result);
    } catch (err) {
      console.error('Error fetching executive summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to load executive summary');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-800">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Error Loading Executive Summary</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
            Executive Summary
          </h2>
          <p className="text-gray-600 mt-1">Platform-wide analytics and performance metrics</p>
        </div>
        <div className="flex gap-2">
          {[
            { value: '30d' as const, label: '30 Days' },
            { value: '90d' as const, label: '90 Days' },
            { value: '12m' as const, label: '12 Months' },
            { value: 'all' as const, label: 'All Time' }
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                dateRange === range.value
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">TOTAL</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{data.platformStats.totalApartments}</div>
          <div className="text-sm font-medium text-blue-700 mt-1">Apartments</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Home className="w-8 h-8 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full">FLATS</span>
          </div>
          <div className="text-3xl font-bold text-emerald-900">{data.platformStats.totalFlats}</div>
          <div className="text-sm font-medium text-emerald-700 mt-1">Total Flats</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-1 rounded-full">ADMINS</span>
          </div>
          <div className="text-3xl font-bold text-amber-900">{data.platformStats.totalAdmins}</div>
          <div className="text-sm font-medium text-amber-700 mt-1">Administrators</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">USERS</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">{data.platformStats.totalOccupants}</div>
          <div className="text-sm font-medium text-purple-700 mt-1">Occupants</div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-8 h-8 text-rose-600" />
            <span className="text-xs font-semibold text-rose-700 bg-rose-200 px-2 py-1 rounded-full">BLOCKS</span>
          </div>
          <div className="text-3xl font-bold text-rose-900">{data.platformStats.totalBuildingsBlocks}</div>
          <div className="text-sm font-medium text-rose-700 mt-1">Buildings/Blocks</div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Financial Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-2">Total Expected</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.financialOverview.totalExpected)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Total Collected</div>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.financialOverview.totalCollected)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Outstanding</div>
              <div className="text-2xl font-bold text-rose-600">{formatCurrency(data.financialOverview.totalOutstanding)}</div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Collection Rate</span>
              <span className="text-2xl font-bold text-emerald-600">{data.financialOverview.collectionRate}%</span>
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(data.financialOverview.collectionRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Payments</span>
              <span className="text-lg font-bold text-gray-900">{data.financialOverview.totalPaymentsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Pending Approvals</span>
              <span className="text-lg font-bold text-amber-600">{data.financialOverview.pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Avg Payment</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(data.financialOverview.averagePaymentAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Metrics & Fraud Detection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Growth Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">New Apartments (30 days)</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{data.growthMetrics.newApartments30Days}</div>
              </div>
              <Calendar className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">New Apartments (90 days)</div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">{data.growthMetrics.newApartments90Days}</div>
              </div>
              <Calendar className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Active Apartments</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{data.growthMetrics.activeApartments}</div>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-600" />
            Fraud Detection
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-rose-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Fraud Detected</div>
                <div className="text-2xl font-bold text-rose-600 mt-1">{data.fraudDetectionStats.totalFraudDetected}</div>
              </div>
              <AlertTriangle className="w-10 h-10 text-rose-600 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Flagged Payments</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">{data.fraudDetectionStats.flaggedPayments}</div>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Rejected Payments</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{data.fraudDetectionStats.rejectedPayments}</div>
              </div>
              <Activity className="w-10 h-10 text-gray-600 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      {data.monthlyTrends.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Monthly Trends
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Month</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Payments</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrends.map((trend, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{trend.month}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{trend.paymentCount}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-600">{formatCurrency(trend.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Performers and Underperformers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {data.topPerformers.length > 0 && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              Top Performers
            </h3>
            <div className="space-y-3">
              {data.topPerformers.map((apt, index) => (
                <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-bold text-gray-900">{apt.apartmentName}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-700 bg-green-200 px-3 py-1 rounded-full">
                      {apt.collectionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{apt.city} • {apt.flatCount} flats</span>
                    <span className="font-semibold text-green-700">{formatCurrency(apt.collectedAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.underperformers.length > 0 && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-rose-600" />
              Needs Attention
            </h3>
            <div className="space-y-3">
              {data.underperformers.map((apt, index) => (
                <div key={index} className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-rose-600 text-white rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-bold text-gray-900">{apt.apartmentName}</span>
                    </div>
                    <span className="text-sm font-semibold text-rose-700 bg-rose-200 px-3 py-1 rounded-full">
                      {apt.collectionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{apt.city} • {apt.flatCount} flats</span>
                    <span className="font-semibold text-rose-700">₹{formatCurrency(apt.outstanding)} due</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Source Distribution */}
      {data.paymentSourceDistribution.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-blue-600" />
            Payment Sources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.paymentSourceDistribution.map((source, index) => (
              <div key={index} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{source.source}</span>
                  <span className="text-sm font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">{source.percentage}%</span>
                </div>
                <div className="text-lg font-bold text-blue-600">{formatCurrency(source.totalAmount)}</div>
                <div className="text-sm text-gray-600 mt-1">{source.count} transactions</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {data.recentPayments.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            Recent Payments
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Apartment</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Flat</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collection</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((payment, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{payment.apartmentName}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{payment.blockName} - {payment.flatNumber}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{payment.collectionName || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{payment.source || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-600">{formatCurrency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
