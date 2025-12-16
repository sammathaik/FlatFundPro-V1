import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Users, Calendar, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatPercentage } from '../../../lib/exportUtils';

interface ExecutiveSummary {
  totalFlats: number;
  activeFlats: number;
  currentMonthCollection: number;
  lastMonthCollection: number;
  totalOutstanding: number;
  pendingVerifications: number;
  fraudAlerts: number;
  collectionRate: number;
  avgPaymentDelay: number;
  digitalAdoptionRate: number;
}

interface Props {
  buildingId: string;
}

export default function ExecutiveSummaryDashboard({ buildingId }: Props) {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutiveSummary();
  }, [buildingId]);

  const loadExecutiveSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_executive_summary', {
        p_building_id: buildingId
      });

      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error loading executive summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) return null;

  const collectionChange = summary.currentMonthCollection - summary.lastMonthCollection;
  const collectionChangePercent = summary.lastMonthCollection > 0
    ? (collectionChange / summary.lastMonthCollection) * 100
    : 0;

  const KPICard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> :
             trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );

  return (
    <div id="executive-summary-report" className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Executive Dashboard</h2>
        <p className="text-blue-100">Real-time insights into your building's financial health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Current Month Collection"
          value={formatCurrency(summary.currentMonthCollection)}
          icon={DollarSign}
          trend={collectionChange >= 0 ? 'up' : 'down'}
          trendValue={`${collectionChangePercent > 0 ? '+' : ''}${collectionChangePercent.toFixed(1)}%`}
          color="bg-green-600"
        />

        <KPICard
          title="Total Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          icon={AlertTriangle}
          trend={summary.totalOutstanding > 0 ? 'down' : 'neutral'}
          trendValue={summary.totalOutstanding > 0 ? 'Action Required' : 'All Clear'}
          color="bg-orange-600"
        />

        <KPICard
          title="Collection Rate"
          value={formatPercentage(summary.collectionRate)}
          icon={TrendingUp}
          trend={summary.collectionRate >= 90 ? 'up' : summary.collectionRate >= 75 ? 'neutral' : 'down'}
          trendValue={
            summary.collectionRate >= 90 ? 'Excellent' :
            summary.collectionRate >= 75 ? 'Good' : 'Needs Attention'
          }
          color="bg-blue-600"
        />

        <KPICard
          title="Active Flats"
          value={`${summary.activeFlats} / ${summary.totalFlats}`}
          icon={Users}
          color="bg-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Pending Verifications</div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.pendingVerifications}
          </div>
          {summary.pendingVerifications > 0 && (
            <div className="mt-2 text-sm text-orange-600 font-medium">
              Requires attention
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Fraud Alerts (30 days)</div>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.fraudAlerts}
          </div>
          {summary.fraudAlerts > 0 && (
            <div className="mt-2 text-sm text-red-600 font-medium">
              Review required
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Avg Payment Delay</div>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.avgPaymentDelay ? `${summary.avgPaymentDelay.toFixed(1)} days` : 'N/A'}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {!summary.avgPaymentDelay || summary.avgPaymentDelay < 7 ? 'Excellent' :
             summary.avgPaymentDelay < 15 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-600">Digital Adoption</div>
            <Zap className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.digitalAdoptionRate ? formatPercentage(summary.digitalAdoptionRate) : 'N/A'}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Last 90 days
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">Collection Health</div>
              <div className="font-semibold text-gray-900">
                {summary.collectionRate >= 85 ? 'Healthy' : 'Needs Attention'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Payment Timeliness</div>
              <div className="font-semibold text-gray-900">
                {!summary.avgPaymentDelay || summary.avgPaymentDelay < 10 ? 'On Time' : 'Delayed'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-sm text-gray-600">Security Status</div>
              <div className="font-semibold text-gray-900">
                {summary.fraudAlerts === 0 ? 'Secure' : 'Active Alerts'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-semibold mb-1">Quick Actions</div>
            <ul className="space-y-1 ml-4 list-disc">
              {summary.pendingVerifications > 0 && (
                <li>Review {summary.pendingVerifications} pending payment verification{summary.pendingVerifications !== 1 ? 's' : ''}</li>
              )}
              {summary.fraudAlerts > 0 && (
                <li>Investigate {summary.fraudAlerts} fraud alert{summary.fraudAlerts !== 1 ? 's' : ''}</li>
              )}
              {summary.totalOutstanding > 0 && (
                <li>Follow up on outstanding amount of {formatCurrency(summary.totalOutstanding)}</li>
              )}
              {summary.collectionRate < 75 && (
                <li>Collection rate below target - consider sending reminders</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
