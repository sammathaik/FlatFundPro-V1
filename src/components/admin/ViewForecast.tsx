import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, Send, CheckCircle, Archive, Download, Printer, FileText, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BudgetVsActualDashboard from './BudgetVsActualDashboard';

interface ViewForecastProps {
  forecastId: string;
  user: any;
  onClose: () => void;
}

interface Forecast {
  id: string;
  apartment_id: string;
  forecast_name: string;
  forecast_period: string;
  forecast_year: number;
  reference_period: string | null;
  reference_year: number | null;
  total_forecast_amount: number;
  total_reference_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  proposed_at: string | null;
  proposed_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
  notes: string | null;
}

interface Category {
  id: string;
  forecast_id: string;
  category_name: string;
  category_type: string;
  category_description: string;
  forecast_amount: number;
  reference_amount: number;
  expense_type: string;
  inflation_percentage: number;
  notes: string | null;
  breakdown: any[];
  display_order: number;
  is_enabled: boolean;
}

const ViewForecast: React.FC<ViewForecastProps> = ({ forecastId, user, onClose }) => {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showActualsTracking, setShowActualsTracking] = useState(false);

  useEffect(() => {
    loadForecast();
  }, [forecastId]);

  const loadForecast = async () => {
    try {
      setLoading(true);

      const { data: forecastData, error: forecastError } = await supabase
        .from('budget_forecasts')
        .select('*')
        .eq('id', forecastId)
        .single();

      if (forecastError) throw forecastError;
      setForecast(forecastData);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('forecast_expense_categories')
        .select('*')
        .eq('forecast_id', forecastId)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async () => {
    try {
      const { error } = await supabase
        .from('budget_forecasts')
        .update({
          status: 'proposed',
          proposed_at: new Date().toISOString(),
          proposed_by: user.id
        })
        .eq('id', forecastId);

      if (error) throw error;

      setShowProposalModal(false);
      loadForecast();
    } catch (error) {
      console.error('Error proposing forecast:', error);
      alert('Error proposing forecast. Please try again.');
    }
  };

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('budget_forecasts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          approval_notes: approvalNotes
        })
        .eq('id', forecastId);

      if (error) throw error;

      setShowApprovalModal(false);
      loadForecast();
    } catch (error) {
      console.error('Error approving forecast:', error);
      alert('Error approving forecast. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('budget_forecasts')
        .delete()
        .eq('id', forecastId);

      if (error) throw error;

      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('Error deleting forecast:', error);
      alert('Error deleting forecast. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Draft' },
      proposed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Proposed' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' }
    };
    const style = styles[status as keyof typeof styles] || styles.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const getPeriodLabel = (period: string) => {
    const labels = {
      quarterly: 'Quarterly',
      'semi-annual': 'Semi-Annual',
      annual: 'Annual'
    };
    return labels[period as keyof typeof labels] || period;
  };

  const getChangePercentage = () => {
    if (!forecast || forecast.total_reference_amount === 0) return null;
    const change = ((forecast.total_forecast_amount - forecast.total_reference_amount) / forecast.total_reference_amount * 100).toFixed(1);
    return parseFloat(change);
  };

  const exportToPDF = () => {
    window.print();
  };

  if (loading || !forecast) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showActualsTracking) {
    return (
      <BudgetVsActualDashboard
        forecastId={forecastId}
        forecastName={forecast.forecast_name}
        user={user}
        onBack={() => setShowActualsTracking(false)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Budget Planning
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{forecast.forecast_name}</h1>
                {getStatusBadge(forecast.status)}
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{getPeriodLabel(forecast.forecast_period)} - FY {forecast.forecast_year}-{forecast.forecast_year + 1}</span>
                </div>
                {forecast.reference_year && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Reference: FY {forecast.reference_year}-{forecast.reference_year + 1}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(forecast.status === 'proposed' || forecast.status === 'approved') && (
                <button
                  onClick={() => setShowActualsTracking(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Track Actuals
                </button>
              )}
              <button
                onClick={exportToPDF}
                className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              {forecast.status === 'draft' && (
                <>
                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Propose
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 flex items-center gap-2"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              {forecast.status === 'proposed' && (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Forecasted Expenses</h3>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            ₹{forecast.total_forecast_amount.toLocaleString('en-IN')}
          </div>
          {forecast.reference_year && getChangePercentage() !== null && (
            <div className={`text-sm font-medium ${(getChangePercentage() || 0) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {(getChangePercentage() || 0) >= 0 ? '+' : ''}{getChangePercentage()}% vs last year
            </div>
          )}
        </div>

        {forecast.reference_year && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Last Year Actual</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              ₹{forecast.total_reference_amount.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-gray-500">
              FY {forecast.reference_year}-{forecast.reference_year + 1}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Per Flat Impact (Estimated)</h3>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            ₹{Math.round(forecast.total_forecast_amount / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-sm text-gray-500">
            Based on 100 flats
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                {forecast.reference_year && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Last Year</th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Forecast</th>
                {forecast.reference_year && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Change</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.filter(c => c.is_enabled).map((category) => {
                const change = category.reference_amount > 0
                  ? ((category.forecast_amount - category.reference_amount) / category.reference_amount * 100).toFixed(1)
                  : null;

                return (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{category.category_name}</div>
                      <div className="text-xs text-gray-500">{category.category_description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {category.expense_type}
                      </span>
                    </td>
                    {forecast.reference_year && (
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₹{category.reference_amount.toLocaleString('en-IN')}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ₹{category.forecast_amount.toLocaleString('en-IN')}
                    </td>
                    {forecast.reference_year && (
                      <td className="px-4 py-3 text-right">
                        {change !== null ? (
                          <span className={parseFloat(change) >= 0 ? 'text-orange-600' : 'text-green-600'}>
                            {parseFloat(change) >= 0 ? '+' : ''}{change}%
                          </span>
                        ) : (
                          <span className="text-gray-400">New</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                      {category.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={forecast.reference_year ? 2 : 1} className="px-4 py-3 font-bold text-gray-900">
                  Total
                </td>
                {forecast.reference_year && (
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ₹{forecast.total_reference_amount.toLocaleString('en-IN')}
                  </td>
                )}
                <td className="px-4 py-3 text-right font-bold text-gray-900">
                  ₹{forecast.total_forecast_amount.toLocaleString('en-IN')}
                </td>
                <td colSpan={forecast.reference_year ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {forecast.notes && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-700">{forecast.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Status History</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Created</div>
              <div className="text-xs text-gray-500">
                {new Date(forecast.created_at).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          {forecast.proposed_at && (
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Proposed to Committee</div>
                <div className="text-xs text-gray-500">
                  {new Date(forecast.proposed_at).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}
          {forecast.approved_at && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Approved</div>
                <div className="text-xs text-gray-500">
                  {new Date(forecast.approved_at).toLocaleString('en-IN')}
                </div>
                {forecast.approval_notes && (
                  <div className="text-sm text-gray-700 mt-1">{forecast.approval_notes}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showProposalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Propose this forecast to committee?</h3>
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">Once proposed:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Visible to all admin users</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Can be reviewed and commented</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Cannot be deleted (only archived)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Can be approved or revised</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowProposalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePropose}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Propose Forecast
              </button>
            </div>
          </div>
        </div>
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve this forecast?</h3>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">By approving:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>This becomes the official budget plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Can be used as reference for collections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Cannot be edited (only create new version)</span>
                </li>
              </ul>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                This does NOT create collection demands automatically. Collections are managed separately in the Collections module.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Notes (optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows={3}
                placeholder="e.g., Approved in Committee meeting 12/May/26"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Approve Forecast
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete this forecast?</h3>
            <p className="text-gray-700 mb-6">
              This action cannot be undone. The forecast and all its categories will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Forecast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewForecast;
