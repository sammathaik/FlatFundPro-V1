import React, { useEffect, useState } from 'react';
import { Download, Users, TrendingUp, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface PaymentSourceStats {
  source: string;
  count: number;
  percentage: number;
}

interface OccupantEngagement {
  totalOccupants: number;
  activeOccupants: number;
  digitalAdopters: number;
  paymentSourceStats: PaymentSourceStats[];
  avgPaymentsPerOccupant: number;
  quickPayers: number;
  slowPayers: number;
}

interface Props {
  buildingId: string;
}

export default function OccupantEngagementAnalytics({ buildingId }: Props) {
  const [data, setData] = useState<OccupantEngagement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagementData();
  }, [buildingId]);

  const loadEngagementData = async () => {
    try {
      setLoading(true);

      const [flatsData, paymentsData] = await Promise.all([
        supabase
          .from('flats')
          .select('*')
          .eq('building_id', buildingId),
        supabase
          .from('payment_submissions')
          .select('*')
          .eq('building_id', buildingId)
          .eq('verification_status', 'verified')
      ]);

      if (flatsData.error) throw flatsData.error;
      if (paymentsData.error) throw paymentsData.error;

      const flats = flatsData.data || [];
      const payments = paymentsData.data || [];

      const totalOccupants = flats.length;
      const activeOccupants = flats.filter(f => f.is_active).length;

      const paymentsByFlat = new Map<string, number>();
      payments.forEach(p => {
        paymentsByFlat.set(p.flat_id, (paymentsByFlat.get(p.flat_id) || 0) + 1);
      });

      const digitalPayments = payments.filter(p =>
        ['mobile', 'web', 'qr_code'].includes(p.payment_source)
      ).length;

      const sourceCounts = new Map<string, number>();
      payments.forEach(p => {
        const source = p.payment_source || 'unknown';
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
      });

      const paymentSourceStats: PaymentSourceStats[] = Array.from(sourceCounts.entries()).map(([source, count]) => ({
        source,
        count,
        percentage: payments.length > 0 ? (count / payments.length) * 100 : 0
      })).sort((a, b) => b.count - a.count);

      const avgPaymentsPerOccupant = totalOccupants > 0 ? payments.length / totalOccupants : 0;

      const quickPayers = Array.from(paymentsByFlat.values()).filter(count => count >= avgPaymentsPerOccupant).length;
      const slowPayers = totalOccupants - quickPayers;

      const digitalAdopters = new Set(
        payments
          .filter(p => ['mobile', 'web', 'qr_code'].includes(p.payment_source))
          .map(p => p.flat_id)
      ).size;

      setData({
        totalOccupants,
        activeOccupants,
        digitalAdopters,
        paymentSourceStats,
        avgPaymentsPerOccupant,
        quickPayers,
        slowPayers
      });
    } catch (error) {
      console.error('Error loading engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.paymentSourceStats) return;
    exportToCSV(data.paymentSourceStats, 'occupant_engagement');
  };

  const handleExportExcel = () => {
    if (!data?.paymentSourceStats) return;
    exportToExcel(data.paymentSourceStats, 'occupant_engagement');
  };

  const handleExportPDF = () => {
    exportToPDF('occupant-engagement-report', 'Occupant Engagement Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const digitalAdoptionRate = data.totalOccupants > 0
    ? (data.digitalAdopters / data.totalOccupants) * 100
    : 0;

  const activeRate = data.totalOccupants > 0
    ? (data.activeOccupants / data.totalOccupants) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Occupant Engagement Analytics</h2>
          <p className="text-gray-600 mt-1">Monitor resident participation and digital adoption</p>
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

      <div id="occupant-engagement-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Occupants</div>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{data.totalOccupants}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Active Rate</div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">
              {formatPercentage(activeRate)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.activeOccupants} active
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Digital Adoption</div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatPercentage(digitalAdoptionRate)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {data.digitalAdopters} adopters
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Avg Payments</div>
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {data.avgPaymentsPerOccupant.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Per occupant
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Source Distribution</h3>
            {data.paymentSourceStats && data.paymentSourceStats.length > 0 ? (
              <div className="space-y-4">
                {data.paymentSourceStats.map((stat, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {stat.source === 'qr_code' ? 'QR Code' : stat.source}
                      </span>
                      <span className="text-sm text-gray-600">
                        {stat.count} ({formatPercentage(stat.percentage)})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          index === 0 ? 'bg-blue-600' :
                          index === 1 ? 'bg-green-600' :
                          index === 2 ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No payment source data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Behavior</h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Regular Payers</span>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {data.quickPayers}
                </div>
                <div className="text-sm text-gray-600">
                  Above average payment frequency
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Needs Encouragement</span>
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {data.slowPayers}
                </div>
                <div className="text-sm text-gray-600">
                  Below average payment frequency
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Users className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Engagement Insights</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • <strong>Digital Adoption:</strong> {digitalAdoptionRate >= 70 ? 'Excellent' : digitalAdoptionRate >= 50 ? 'Good' : 'Needs Improvement'}
                  {digitalAdoptionRate < 70 && ' - Consider promoting the benefits of digital payments'}
                </li>
                <li>
                  • <strong>Active Participation:</strong> {activeRate >= 90 ? 'Outstanding' : activeRate >= 75 ? 'Good' : 'Requires Attention'}
                  {activeRate < 90 && ' - Reach out to inactive residents'}
                </li>
                <li>
                  • <strong>Payment Frequency:</strong> Average of {data.avgPaymentsPerOccupant.toFixed(1)} payments per resident
                </li>
                {data.slowPayers > 0 && (
                  <li>
                    • <strong>Action Item:</strong> {data.slowPayers} resident{data.slowPayers !== 1 ? 's' : ''} may benefit from payment reminders
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
