import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, XCircle, Edit, Trash2, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ActualExpenseEntry from './ActualExpenseEntry';

interface BudgetVsActualDashboardProps {
  forecastId: string;
  forecastName: string;
  user: any;
  onBack: () => void;
}

interface CategoryUtilization {
  category_id: string;
  category_name: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
  utilization_percentage: number;
  status: string;
}

interface ForecastSummary {
  total_budget: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number;
  utilization_percentage: number;
  categories_on_track: number;
  categories_warning: number;
  categories_critical: number;
  categories_over_budget: number;
  active_alerts_count: number;
}

interface Alert {
  id: string;
  category_id: string;
  alert_type: string;
  alert_message: string;
  severity: string;
  status: string;
  created_at: string;
}

interface ActualExpense {
  id: string;
  expense_date: string;
  expense_description: string;
  expense_amount: number;
  vendor_name: string | null;
  invoice_number: string | null;
  payment_status: string;
  category_name: string;
}

const BudgetVsActualDashboard: React.FC<BudgetVsActualDashboardProps> = ({
  forecastId,
  forecastName,
  user,
  onBack
}) => {
  const [utilization, setUtilization] = useState<CategoryUtilization[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ActualExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseEntry, setShowExpenseEntry] = useState(false);

  useEffect(() => {
    loadData();
  }, [forecastId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [utilizationData, summaryData, alertsData, expensesData] = await Promise.all([
        supabase.rpc('get_budget_utilization', { p_forecast_id: forecastId }),
        supabase.rpc('get_forecast_summary', { p_forecast_id: forecastId }).single(),
        supabase
          .from('budget_alerts')
          .select('*')
          .eq('forecast_id', forecastId)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('actual_expenses')
          .select(`
            id,
            expense_date,
            expense_description,
            expense_amount,
            vendor_name,
            invoice_number,
            payment_status,
            forecast_expense_categories!inner(category_name)
          `)
          .eq('forecast_id', forecastId)
          .order('expense_date', { ascending: false })
          .limit(10)
      ]);

      if (utilizationData.error) throw utilizationData.error;
      if (summaryData.error) throw summaryData.error;
      if (alertsData.error) throw alertsData.error;
      if (expensesData.error) throw expensesData.error;

      setUtilization(utilizationData.data || []);
      setSummary(summaryData.data);
      setAlerts(alertsData.data || []);

      const expensesWithCategoryName = expensesData.data?.map((exp: any) => ({
        ...exp,
        category_name: exp.forecast_expense_categories?.category_name || 'Unknown'
      })) || [];
      setRecentExpenses(expensesWithCategoryName);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      on_track: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: 'On Track' },
      warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertTriangle className="w-4 h-4" />, label: 'Warning' },
      critical: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <AlertTriangle className="w-4 h-4" />, label: 'Critical' },
      over_budget: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-4 h-4" />, label: 'Over Budget' },
      not_started: { bg: 'bg-gray-100', text: 'text-gray-600', icon: null, label: 'Not Started' },
      no_budget: { bg: 'bg-gray-100', text: 'text-gray-600', icon: null, label: 'No Budget' }
    };
    const style = styles[status as keyof typeof styles] || styles.not_started;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {style.label}
      </span>
    );
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Budget Planning
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Budget vs Actual: {forecastName}</h1>
            <p className="text-gray-600">Track actual expenses against your budget forecast</p>
          </div>
          <button
            onClick={() => setShowExpenseEntry(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Record Expense
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">Active Budget Alerts ({alerts.length})</h3>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="text-sm text-orange-800">
                    • {alert.alert_message}
                  </div>
                ))}
                {alerts.length > 3 && (
                  <div className="text-sm text-orange-600 font-medium">
                    +{alerts.length - 3} more alerts
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Budget</h3>
            <div className="text-2xl font-bold text-gray-900">
              ₹{summary.total_budget.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Actual Spent</h3>
            <div className="text-2xl font-bold text-gray-900">
              ₹{summary.total_actual.toLocaleString('en-IN')}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {summary.utilization_percentage.toFixed(1)}% utilized
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Remaining</h3>
            <div className={`text-2xl font-bold ${summary.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{Math.abs(summary.total_variance).toLocaleString('en-IN')}
            </div>
            <div className={`text-sm font-medium mt-1 flex items-center gap-1 ${
              summary.total_variance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary.total_variance >= 0 ? (
                <><TrendingDown className="w-4 h-4" /> {summary.variance_percentage.toFixed(1)}% under</>
              ) : (
                <><TrendingUp className="w-4 h-4" /> {Math.abs(summary.variance_percentage).toFixed(1)}% over</>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Category Status</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">On Track:</span>
                <span className="font-medium">{summary.categories_on_track}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">Warning:</span>
                <span className="font-medium">{summary.categories_warning}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Critical:</span>
                <span className="font-medium">{summary.categories_critical}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Over Budget:</span>
                <span className="font-medium">{summary.categories_over_budget}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category-wise Utilization</h2>
        <div className="space-y-4">
          {utilization.map((cat) => (
            <div key={cat.category_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{cat.category_name}</h3>
                    {getStatusBadge(cat.status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        ₹{cat.budget_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        ₹{cat.actual_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Variance:</span>
                      <span className={`font-medium ml-2 ${
                        cat.variance_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cat.variance_amount >= 0 ? '+' : ''}₹{cat.variance_amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {cat.utilization_percentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">utilized</div>
                </div>
              </div>

              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getUtilizationColor(cat.utilization_percentage)} transition-all duration-300`}
                    style={{ width: `${Math.min(cat.utilization_percentage, 100)}%` }}
                  />
                </div>
                {cat.utilization_percentage > 0 && (
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0%</span>
                    <span className="text-gray-400">80%</span>
                    <span className="text-gray-400">90%</span>
                    <span>100%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h2>
        {recentExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No expenses recorded yet</p>
            <button
              onClick={() => setShowExpenseEntry(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Record your first expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {expense.category_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {expense.expense_description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {expense.vendor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      ₹{expense.expense_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        expense.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : expense.payment_status === 'partially_paid'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {expense.payment_status === 'paid' ? 'Paid' :
                         expense.payment_status === 'partially_paid' ? 'Partial' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showExpenseEntry && (
        <ActualExpenseEntry
          forecastId={forecastId}
          onClose={() => setShowExpenseEntry(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default BudgetVsActualDashboard;
