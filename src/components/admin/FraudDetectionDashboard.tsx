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

interface FlaggedPayment {
  id: string;
  payment_submission_id: string;
  fraud_risk_score: number;
  is_flagged: boolean;
  phash_duplicate_found: boolean;
  phash_similarity_score: number | null;
  exif_has_editor_metadata: boolean;
  exif_software_detected: string | null;
  visual_consistency_score: number;
  ela_score: number;
  ela_manipulation_detected: boolean;
  analyzed_at: string;
  payment_submissions: {
    id: string;
    name: string;
    email: string;
    payment_amount: number;
    payment_date: string;
    status: string;
    apartments: {
      apartment_name: string;
    };
  };
}

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
    if (filterLevel === 'critical') return payment.fraud_risk_score >= 80;
    if (filterLevel === 'high') return payment.fraud_risk_score >= 60 && payment.fraud_risk_score < 80;
    if (filterLevel === 'medium') return payment.fraud_risk_score >= 40 && payment.fraud_risk_score < 60;
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
            <p className="text-sm text-gray-600">Phase 1: Image Fraud Detection System</p>
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
                <p className="text-sm font-medium text-gray-600">Total Analyzed</p>
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
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{statistics.flagged}</p>
                <p className="text-xs text-gray-500 mt-1">{statistics.flaggedPercentage}% of total</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Duplicates Found</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{statistics.duplicates}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Copy className="w-6 h-6 text-orange-600" />
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Detection Methods</span>
            </div>
            <div className="space-y-1 text-sm text-green-700">
              <p>✓ Perceptual Hash (98%)</p>
              <p>✓ EXIF Analysis (75%)</p>
              <p>✓ Visual Check (80%)</p>
              <p>✓ Error Level Analysis (85%)</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Copy className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Duplicate Detection</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{statistics?.duplicates || 0}</p>
            <p className="text-xs text-blue-600 mt-1">Reused screenshots blocked</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Edit3 className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Edited Images</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{statistics?.edited || 0}</p>
            <p className="text-xs text-orange-600 mt-1">Photoshop/GIMP detected</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Manipulated</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{statistics?.manipulated || 0}</p>
            <p className="text-xs text-red-600 mt-1">Forgery detected via ELA</p>
          </div>
        </div>
      </div>

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
                        <div className="text-sm font-medium text-gray-900">{payment.payment_submissions.name}</div>
                        <div className="text-sm text-gray-500">{payment.payment_submissions.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₹{payment.payment_submissions.payment_amount?.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevelBgColor(
                            payment.fraud_risk_score
                          )} ${getRiskLevelColor(payment.fraud_risk_score)}`}
                        >
                          {payment.fraud_risk_score}
                        </span>
                        <span className="text-xs text-gray-600">
                          {getRiskLevelLabel(payment.fraud_risk_score)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {payment.phash_duplicate_found && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                            <Copy className="w-3 h-3 mr-1" />
                            Duplicate
                          </span>
                        )}
                        {payment.exif_has_editor_metadata && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edited
                          </span>
                        )}
                        {payment.ela_manipulation_detected && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Manipulated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(payment.analyzed_at).toLocaleDateString()}
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
                    <p className="text-sm font-medium text-red-900">Overall Risk Score</p>
                    <p className="text-4xl font-bold text-red-600 mt-1">
                      {selectedPayment.fraud_risk_score}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {getRiskLevelLabel(selectedPayment.fraud_risk_score)} Risk
                    </p>
                  </div>
                  <AlertTriangle className="w-16 h-16 text-red-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Copy className="w-4 h-4 mr-2 text-blue-600" />
                    Duplicate Detection
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span
                        className={
                          selectedPayment.phash_duplicate_found ? 'text-red-600 font-medium' : 'text-green-600'
                        }
                      >
                        {selectedPayment.phash_duplicate_found ? 'Duplicate Found' : 'No Duplicate'}
                      </span>
                    </div>
                    {selectedPayment.phash_similarity_score && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Similarity:</span>
                        <span className="font-medium">{selectedPayment.phash_similarity_score}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Edit3 className="w-4 h-4 mr-2 text-orange-600" />
                    EXIF Analysis
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Edited:</span>
                      <span
                        className={
                          selectedPayment.exif_has_editor_metadata ? 'text-red-600 font-medium' : 'text-green-600'
                        }
                      >
                        {selectedPayment.exif_has_editor_metadata ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {selectedPayment.exif_software_detected && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Software:</span>
                        <span className="font-medium">{selectedPayment.exif_software_detected}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2 text-purple-600" />
                    Visual Consistency
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Score:</span>
                      <span className="font-medium">{selectedPayment.visual_consistency_score}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                    Error Level Analysis
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ELA Score:</span>
                      <span className="font-medium">{selectedPayment.ela_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manipulation:</span>
                      <span
                        className={
                          selectedPayment.ela_manipulation_detected ? 'text-red-600 font-medium' : 'text-green-600'
                        }
                      >
                        {selectedPayment.ela_manipulation_detected ? 'Detected' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedPayment.payment_submissions.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">
                      ₹{selectedPayment.payment_submissions.payment_amount?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{selectedPayment.payment_submissions.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">
                      {new Date(selectedPayment.payment_submissions.payment_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
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
