import { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp, BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { getClassificationStatistics } from '../../lib/documentClassification';
import { useAuth } from '../../contexts/AuthContext';

export default function ClassificationAnalytics() {
  const { adminData } = useAuth();
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, [adminData]);

  async function loadStatistics() {
    if (!adminData?.apartment_id) return;

    setLoading(true);
    const stats = await getClassificationStatistics(adminData.apartment_id);
    setStatistics(stats);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!statistics || !statistics.total_classifications) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Classifications Yet
          </h3>
          <p className="text-gray-600">
            Document classifications will appear here once payments are analyzed.
          </p>
        </div>
      </div>
    );
  }

  const byConfidence = statistics.by_confidence || {};
  const byDocumentType = statistics.by_document_type || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Classifications</h3>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics.total_classifications || 0}</p>
          <p className="text-sm text-gray-600 mt-1">
            {statistics.last_30_days_count || 0} in last 30 days
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Cost</h3>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${(statistics.total_cost_usd || 0).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            ${(statistics.total_cost_usd / (statistics.total_classifications || 1)).toFixed(3)} per classification
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Avg Processing Time</h3>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {statistics.avg_processing_time_ms || 0}ms
          </p>
          <p className="text-sm text-gray-600 mt-1">AI response time</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">High Confidence</h3>
            <BarChart3 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {byConfidence.High || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {statistics.total_classifications > 0
              ? Math.round((byConfidence.High || 0) / statistics.total_classifications * 100)
              : 0}% of total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">By Confidence Level</h3>
          </div>
          <div className="space-y-3">
            {['High', 'Medium', 'Low'].map((level) => {
              const count = byConfidence[level] || 0;
              const percentage = statistics.total_classifications > 0
                ? (count / statistics.total_classifications) * 100
                : 0;
              const color =
                level === 'High' ? 'bg-green-500' : level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500';

              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{level} Confidence</span>
                    <span className="text-sm text-gray-600">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">By Document Type</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(byDocumentType).map(([type, count]) => {
              const percentage = statistics.total_classifications > 0
                ? ((count as number) / statistics.total_classifications) * 100
                : 0;

              return (
                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{count as number}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Cost Information</h4>
        <p className="text-sm text-blue-800">
          Classifications are powered by GPT-4 Turbo. Costs are estimated at $0.02 per classification
          on average. Total monthly cost for {statistics.last_30_days_count || 0} classifications in the
          last 30 days: <strong>${((statistics.last_30_days_count || 0) * 0.02).toFixed(2)}</strong>
        </p>
      </div>
    </div>
  );
}
