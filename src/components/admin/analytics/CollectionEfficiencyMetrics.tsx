import React, { useEffect, useState } from 'react';
import { Download, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface QuarterlyRate {
  quarter: number;
  year: number;
  expected: number;
  collected: number;
  rate: number;
}

interface CollectionEfficiency {
  onTimePayments: number;
  withinGracePeriod: number;
  latePayments: number;
  veryLatePayments: number;
  averageDelay: number;
  onTimeRate: number;
  collectionRateByQuarter: QuarterlyRate[];
}

interface Props {
  buildingId: string;
}

export default function CollectionEfficiencyMetrics({ buildingId }: Props) {
  const [data, setData] = useState<CollectionEfficiency | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCollectionEfficiency();
  }, [buildingId, dateRange]);

  const loadCollectionEfficiency = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_collection_efficiency', {
        p_building_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading collection efficiency:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.collectionRateByQuarter) return;
    const exportData = data.collectionRateByQuarter.map(q => ({
      'Quarter': `Q${q.quarter} ${q.year}`,
      'Expected': q.expected,
      'Collected': q.collected,
      'Collection Rate': `${q.rate}%`
    }));
    exportToCSV(exportData, 'collection_efficiency');
  };

  const handleExportExcel = () => {
    if (!data?.collectionRateByQuarter) return;
    const exportData = data.collectionRateByQuarter.map(q => ({
      'Quarter': `Q${q.quarter} ${q.year}`,
      'Expected': q.expected,
      'Collected': q.collected,
      'Collection Rate': `${q.rate}%`
    }));
    exportToExcel(exportData, 'collection_efficiency');
  };

  const handleExportPDF = () => {
    exportToPDF('collection-efficiency-report', 'Collection Efficiency Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const totalPayments = data.onTimePayments + data.withinGracePeriod + data.latePayments + data.veryLatePayments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Collection Efficiency Metrics</h2>
          <p className="text-gray-600 mt-1">Analyze payment timeliness and collection patterns</p>
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

      <div id="collection-efficiency-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">On-Time Rate</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatPercentage(data.onTimeRate || 0)}
            </div>
            <div className="text-sm text-gray-600">
              {data.onTimePayments} of {totalPayments} payments
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Average Delay</div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {data.averageDelay ? `${data.averageDelay} days` : '0 days'}
            </div>
            <div className="text-sm text-gray-600">
              Per payment received
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Analyzed</div>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {totalPayments}
            </div>
            <div className="text-sm text-gray-600">
              Payment submissions
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Timeliness Breakdown</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-gray-900">On Time (Due Date)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.onTimePayments} ({totalPayments > 0 ? formatPercentage((data.onTimePayments / totalPayments) * 100) : '0%'})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${totalPayments > 0 ? (data.onTimePayments / totalPayments) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Within Grace Period (1-7 days)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.withinGracePeriod} ({totalPayments > 0 ? formatPercentage((data.withinGracePeriod / totalPayments) * 100) : '0%'})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${totalPayments > 0 ? (data.withinGracePeriod / totalPayments) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-gray-900">Late (8-30 days)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.latePayments} ({totalPayments > 0 ? formatPercentage((data.latePayments / totalPayments) * 100) : '0%'})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full"
                  style={{ width: `${totalPayments > 0 ? (data.latePayments / totalPayments) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-gray-900">Very Late (30+ days)</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.veryLatePayments} ({totalPayments > 0 ? formatPercentage((data.veryLatePayments / totalPayments) * 100) : '0%'})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full"
                  style={{ width: `${totalPayments > 0 ? (data.veryLatePayments / totalPayments) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Collection Performance</h3>
          {data.collectionRateByQuarter && data.collectionRateByQuarter.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Quarter</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Expected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Collected</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.collectionRateByQuarter.map((quarter, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">Q{quarter.quarter} {quarter.year}</td>
                      <td className="py-3 px-4 text-right">₹{quarter.expected.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        ₹{quarter.collected.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatPercentage(quarter.rate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                quarter.rate >= 90 ? 'bg-green-600' :
                                quarter.rate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(quarter.rate, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            quarter.rate >= 90 ? 'text-green-600' :
                            quarter.rate >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {quarter.rate >= 90 ? 'Excellent' :
                             quarter.rate >= 75 ? 'Good' : 'Poor'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No quarterly data available</p>
          )}
        </div>

        <div className={`rounded-lg p-6 ${
          data.onTimeRate >= 80 ? 'bg-green-50 border-2 border-green-200' :
          data.onTimeRate >= 60 ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {data.onTimeRate >= 80 ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-orange-600 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Efficiency Assessment</h3>
              <p className="text-gray-700">
                {data.onTimeRate >= 80 ? (
                  'Excellent payment timeliness! Your residents are highly responsive to payment deadlines.'
                ) : data.onTimeRate >= 60 ? (
                  'Good payment efficiency. Consider sending reminders a few days before due dates to improve on-time payments.'
                ) : (
                  'Payment timeliness needs improvement. Implement automated reminders and follow up with defaulters promptly.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
