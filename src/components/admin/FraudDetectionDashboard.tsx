import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Copy,
  Edit3,
  Image as ImageIcon,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  BarChart3,
} from 'lucide-react';
import {
  getAllFlaggedPayments,
  getFraudStatistics,
  getRiskLevelLabel,
  getRiskLevelColor,
  getRiskLevelBgColor,
  FraudAnalysisRecord,
} from '../../lib/fraudDetection';

interface FlaggedPayment extends FraudAnalysisRecord {}

interface Props {
  apartmentId?: string;
}

export function FraudDetectionDashboard({ apartmentId }: Props) {
  const [flaggedPayments, setFlaggedPayments] = useState<FlaggedPayment[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<FlaggedPayment | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [apartmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [flagged, stats] = await Promise.all([
        getAllFlaggedPayments(apartmentId),
        getFraudStatistics(apartmentId),
      ]);
      setFlaggedPayments(flagged as any);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading fraud data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = flaggedPayments.filter(payment => {
    if (filterLevel === 'all') return true;
    if (filterLevel === 'critical') return payment.fraud_score >= 80;
    if (filterLevel === 'high') return payment.fraud_score >= 60 && payment.fraud_score < 80;
    if (filterLevel === 'medium') return payment.fraud_score >= 40 && payment.fraud_score < 60;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading fraud detection data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Fraud Detection Dashboard</h2>
            <p className="text-sm text-gray-600">Text-Based Fraud Detection System</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checked</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{statistics.checked}</p>
                <p className="text-xs text-gray-500 mt-1">Analyzed payments</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{statistics.flagged}</p>
                <p className="text-xs text-gray-500 mt-1">{statistics.flaggedPercentage}% of checked</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.avgRiskScore}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {statistics && statistics.indicatorTypes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-900 mb-1">Future Date</p>
              <p className="text-2xl font-bold text-red-600">{statistics.indicatorTypes.FUTURE_DATE}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-900 mb-1">Suspicious UPI</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.indicatorTypes.SUSPICIOUS_UPI_ID}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-900 mb-1">Suspicious TXN</p>
              <p className="text-2xl font-bold text-yellow-600">{statistics.indicatorTypes.SUSPICIOUS_TRANSACTION_ID}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-900 mb-1">Typos</p>
              <p className="text-2xl font-bold text-purple-600">{statistics.indicatorTypes.SUSPICIOUS_TYPO}</p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
              <p className="text-xs font-medium text-pink-900 mb-1">Template Text</p>
              <p className="text-2xl font-bold text-pink-600">{statistics.indicatorTypes.TEMPLATE_TEXT}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs font-medium text-indigo-900 mb-1">Invalid UPI</p>
              <p className="text-2xl font-bold text-indigo-600">{statistics.indicatorTypes.INVALID_UPI_FORMAT}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Bad Narration</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.indicatorTypes.SUSPICIOUS_NARRATION}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-900 mb-1">Bad Bank</p>
              <p className="text-2xl font-bold text-green-600">{statistics.indicatorTypes.SUSPICIOUS_BANK_NAME}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-900 mb-1">Edited Image</p>
              <p className="text-2xl font-bold text-gray-600">{statistics.indicatorTypes.EDITING_SOFTWARE_DETECTED}</p>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-xs font-medium text-teal-900 mb-1">Old Date</p>
              <p className="text-2xl font-bold text-teal-600">{statistics.indicatorTypes.OLD_DATE}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Flagged Payments</h3>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Filter:</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical (80+)</option>
                <option value="high">High (60-79)</option>
                <option value="medium">Medium (40-59)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No flagged payments found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fraud Indicators
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analyzed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.name}</div>
                        <div className="text-sm text-gray-500">{payment.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₹{payment.payment_amount?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelBgColor(
                            payment.fraud_score
                          )} ${getRiskLevelColor(payment.fraud_score)}`}
                        >
                          {payment.fraud_score}
                        </span>
                        <span className="text-xs text-gray-600">
                          {getRiskLevelLabel(payment.fraud_score)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {payment.fraud_indicators?.slice(0, 3).map((indicator, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                              indicator.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : indicator.severity === 'HIGH'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {indicator.type.split('_').slice(0, 2).join(' ')}
                          </span>
                        ))}
                        {payment.fraud_indicators && payment.fraud_indicators.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                            +{payment.fraud_indicators.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {payment.fraud_checked_at
                          ? new Date(payment.fraud_checked_at).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-blue-600 hover:text-blue-900 font-medium flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Fraud Analysis Details</h3>
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Fraud Risk Score</p>
                    <p className="text-4xl font-bold text-red-600 mt-1">{selectedPayment.fraud_score}</p>
                    <p className="text-sm text-red-700 mt-1">
                      {getRiskLevelLabel(selectedPayment.fraud_score)} Risk
                    </p>
                  </div>
                  <AlertTriangle className="w-16 h-16 text-red-400" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                  Fraud Indicators ({selectedPayment.fraud_indicators?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedPayment.fraud_indicators && selectedPayment.fraud_indicators.length > 0 ? (
                    selectedPayment.fraud_indicators.map((indicator, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          indicator.severity === 'CRITICAL'
                            ? 'bg-red-50 border-red-200'
                            : indicator.severity === 'HIGH'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{indicator.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-600 mt-1">{indicator.message}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                indicator.severity === 'CRITICAL'
                                  ? 'bg-red-100 text-red-700'
                                  : indicator.severity === 'HIGH'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {indicator.severity}
                            </span>
                            <span className="text-sm font-bold text-gray-900">+{indicator.points}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No fraud indicators detected</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedPayment.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">₹{selectedPayment.payment_amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedPayment.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedPayment.payment_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {selectedPayment.transaction_reference && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Extracted Payment Details</h4>
                  <div className="space-y-2 text-sm">
                    {selectedPayment.transaction_reference && (
                      <div>
                        <span className="text-gray-600">Transaction Ref:</span>
                        <span className="ml-2 font-medium font-mono">{selectedPayment.transaction_reference}</span>
                      </div>
                    )}
                    {selectedPayment.sender_upi_id && (
                      <div>
                        <span className="text-gray-600">UPI ID:</span>
                        <span className="ml-2 font-medium font-mono">{selectedPayment.sender_upi_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedPayment(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
