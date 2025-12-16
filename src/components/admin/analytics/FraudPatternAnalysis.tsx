import React, { useEffect, useState } from 'react';
import { Download, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatDate, formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface FraudType {
  type: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
  flagged: number;
  rate: number;
}

interface FraudIncident {
  id: string;
  flatNumber: string;
  amount: number;
  date: string;
  status: string;
  reason: string;
}

interface FraudAnalytics {
  totalSubmissions: number;
  flaggedCount: number;
  verifiedCount: number;
  rejectedCount: number;
  fraudRate: number;
  fraudByType: FraudType[];
  monthlyTrend: MonthlyTrend[];
  recentIncidents: FraudIncident[];
}

interface Props {
  buildingId: string;
}

export default function FraudPatternAnalysis({ buildingId }: Props) {
  const [data, setData] = useState<FraudAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadFraudAnalytics();
  }, [buildingId, dateRange]);

  const loadFraudAnalytics = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_fraud_analytics', {
        p_building_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading fraud analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.recentIncidents) return;
    exportToCSV(data.recentIncidents, 'fraud_incidents');
  };

  const handleExportExcel = () => {
    if (!data?.recentIncidents) return;
    exportToExcel(data.recentIncidents, 'fraud_incidents');
  };

  const handleExportPDF = () => {
    exportToPDF('fraud-analysis-report', 'Fraud Pattern Analysis Report');
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
          <h2 className="text-2xl font-bold text-gray-900">Fraud Pattern Analysis</h2>
          <p className="text-gray-600 mt-1">Monitor and analyze suspicious payment activities</p>
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

      <div id="fraud-analysis-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Submissions</div>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {data.totalSubmissions}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Flagged</div>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {data.flaggedCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Verified</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {data.verifiedCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Rejected</div>
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {data.rejectedCount}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Fraud Rate</div>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatPercentage(data.fraudRate || 0)}
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 ${
          data.fraudRate === 0 ? 'bg-green-50 border-2 border-green-200' :
          data.fraudRate < 5 ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {data.fraudRate === 0 ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Security Status</h3>
              <p className="text-gray-700">
                {data.fraudRate === 0 ? (
                  'Excellent! No fraudulent activities detected in this period.'
                ) : data.fraudRate < 5 ? (
                  `Low fraud rate detected (${formatPercentage(data.fraudRate)}). Continue monitoring suspicious activities.`
                ) : (
                  `Warning: High fraud rate detected (${formatPercentage(data.fraudRate)}). Immediate attention required.`
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Detection by Type</h3>
            {data.fraudByType && data.fraudByType.length > 0 ? (
              <div className="space-y-3">
                {data.fraudByType.map((type, index) => {
                  const total = data.fraudByType.reduce((sum, t) => sum + t.count, 0);
                  const percentage = total > 0 ? (type.count / total) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{type.type}</span>
                        <span className="text-sm text-gray-600">
                          {type.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            type.type === 'Clear' ? 'bg-green-600' :
                            type.type === 'Flagged' ? 'bg-orange-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Fraud Trend</h3>
            {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {data.monthlyTrend.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="text-sm font-medium text-gray-700">{trend.month}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">
                        {trend.flagged} / {trend.total}
                      </div>
                      <div className={`text-sm font-semibold ${
                        trend.rate === 0 ? 'text-green-600' :
                        trend.rate < 5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(trend.rate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No trend data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Fraud Incidents</h3>
          {data.recentIncidents && data.recentIncidents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Flat</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{incident.flatNumber}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(incident.amount)}</td>
                      <td className="py-3 px-4">{formatDate(incident.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          incident.status === 'high_risk' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {incident.status === 'high_risk' ? 'High Risk' : 'Flagged'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {incident.reason || 'No reason provided'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500">No fraud incidents detected!</p>
              <p className="text-sm text-gray-400 mt-1">Your building's payments are secure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
