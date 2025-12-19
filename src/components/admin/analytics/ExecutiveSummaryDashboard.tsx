import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, Download, Info, Building, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, formatPercentage, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface CollectionBreakdown {
  collectionName: string;
  frequency: string;
  dueDate: string;
  expectedAmount: number;
  dailyFine: number;
  collectedAmount: number;
}

interface MonthWiseData {
  month: string;
  monthStart: string;
  monthEnd: string;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  expectedFines: number;
  collectionsBreakdown: CollectionBreakdown[];
}

interface Summary {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  overallCollectionRate: number;
}

interface ExecutiveSummary {
  apartmentMode: 'A' | 'B' | 'C';
  flatCount: number;
  totalBuiltUpArea: number;
  dateRange: {
    start: string;
    end: string;
  };
  monthWiseData: MonthWiseData[];
  summary: Summary;
}

interface Props {
  buildingId: string;
}

const MaintenanceModeInfo = {
  A: {
    label: 'Mode A: Equal / Flat Rate',
    description: 'Each flat pays the same fixed amount regardless of size or type',
    icon: Users,
    color: 'blue'
  },
  B: {
    label: 'Mode B: Area-Based (Built-up Area)',
    description: 'Payment calculated based on flat area × rate per sq.ft',
    icon: LayoutGrid,
    color: 'green'
  },
  C: {
    label: 'Mode C: Flat-Type Based',
    description: 'Payment varies by flat type (1BHK, 2BHK, etc.)',
    icon: Building,
    color: 'purple'
  }
};

export default function ExecutiveSummaryDashboard({ buildingId }: Props) {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
  });

  useEffect(() => {
    loadExecutiveSummary();
  }, [buildingId, dateRange]);

  const loadExecutiveSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_month_wise_executive_summary', {
        p_apartment_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setSummary(data);
    } catch (error) {
      console.error('Error loading executive summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonthExpansion = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const handleExportCSV = () => {
    if (!summary?.monthWiseData) return;
    const exportData = summary.monthWiseData.map(month => ({
      Month: month.month,
      'Total Expected': month.totalExpected,
      'Total Collected': month.totalCollected,
      'Total Outstanding': month.totalOutstanding,
      'Expected Fines': month.expectedFines,
      'Collection Rate': month.totalExpected > 0 ? ((month.totalCollected / month.totalExpected) * 100).toFixed(2) + '%' : '0%'
    }));
    exportToCSV(exportData, 'month_wise_executive_summary');
  };

  const handleExportExcel = () => {
    if (!summary?.monthWiseData) return;
    const exportData = summary.monthWiseData.map(month => ({
      Month: month.month,
      'Total Expected': month.totalExpected,
      'Total Collected': month.totalCollected,
      'Total Outstanding': month.totalOutstanding,
      'Expected Fines': month.expectedFines,
      'Collection Rate': month.totalExpected > 0 ? ((month.totalCollected / month.totalExpected) * 100).toFixed(2) + '%' : '0%'
    }));
    exportToExcel(exportData, 'month_wise_executive_summary');
  };

  const handleExportPDF = () => {
    exportToPDF('executive-summary-report', 'Month-wise Executive Summary Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>Unable to load executive summary</p>
        <button
          onClick={loadExecutiveSummary}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const modeInfo = MaintenanceModeInfo[summary.apartmentMode];
  const ModeIcon = modeInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Month-wise Executive Summary</h2>
          <p className="text-gray-600 mt-1">Comprehensive collections view for committee review</p>
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

      <div id="executive-summary-report" className="space-y-6">
        {/* Apartment Configuration */}
        <div className={`bg-gradient-to-br from-${modeInfo.color}-50 to-${modeInfo.color}-100 rounded-lg shadow-lg p-6 border border-${modeInfo.color}-200`}>
          <div className="flex items-start gap-4">
            <div className={`flex items-center justify-center w-12 h-12 bg-${modeInfo.color}-200 rounded-lg`}>
              <ModeIcon className={`w-6 h-6 text-${modeInfo.color}-700`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold text-${modeInfo.color}-900 mb-1`}>Apartment Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">Maintenance Mode</div>
                  <div className={`font-bold text-${modeInfo.color}-700`}>{modeInfo.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{modeInfo.description}</div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="text-xs text-gray-600 mb-1">Total Flats</div>
                  <div className="font-bold text-2xl text-gray-900">{summary.flatCount}</div>
                </div>
                {summary.apartmentMode === 'B' && (
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-600 mb-1">Total Built-up Area</div>
                    <div className="font-bold text-2xl text-gray-900">{summary.totalBuiltUpArea.toLocaleString()} sq.ft</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-blue-900 mb-1">Total Expected</div>
                <div className="text-xs text-blue-700">For entire period</div>
              </div>
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(summary.summary.totalExpected)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-green-900 mb-1">Total Collected</div>
                <div className="text-xs text-green-700">Verified payments</div>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.summary.totalCollected)}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-orange-900 mb-1">Total Outstanding</div>
                <div className="text-xs text-orange-700">Pending collections</div>
              </div>
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(summary.summary.totalOutstanding)}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-md p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-purple-900 mb-1">Collection Rate</div>
                <div className="text-xs text-purple-700">Overall efficiency</div>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">{formatPercentage(summary.summary.overallCollectionRate)}</div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Understanding Month-wise Collections:</p>
              <ul className="text-blue-800 space-y-1 leading-relaxed list-disc list-inside">
                <li><strong>Monthly collections</strong> contribute expected amount every month</li>
                <li><strong>Quarterly collections</strong> contribute only in the quarter's due month</li>
                <li><strong>One-time collections</strong> contribute only in their due month</li>
                <li><strong>Fines</strong> accrue per unpaid flat per day after due date</li>
                <li><strong>Expected amounts</strong> calculated based on {modeInfo.label}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Month-wise Collections Table */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Month-wise Collections View</h3>
            <p className="text-sm text-gray-600 mt-1">Click on any month to see collection-wise breakdown</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-bold text-gray-700 w-16"></th>
                  <th className="text-left py-4 px-4 font-bold text-gray-700">Month</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Expected</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Collected</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Outstanding</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Fines (as of today)</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthWiseData.map((month, index) => {
                  const isExpanded = expandedMonths.has(month.month);
                  const collectionRate = month.totalExpected > 0 ? (month.totalCollected / month.totalExpected) * 100 : 0;
                  const hasCollections = month.collectionsBreakdown && month.collectionsBreakdown.length > 0;

                  return (
                    <React.Fragment key={month.month}>
                      <tr
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => hasCollections && toggleMonthExpansion(month.month)}
                      >
                        <td className="py-3 px-4">
                          {hasCollections && (
                            <button className="text-gray-500 hover:text-gray-700">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{month.month}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatCurrency(month.totalExpected)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">
                          {formatCurrency(month.totalCollected)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-orange-700">
                          {formatCurrency(month.totalOutstanding)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-red-700">
                          {month.expectedFines > 0 ? formatCurrency(month.expectedFines) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            collectionRate >= 90 ? 'bg-green-100 text-green-800 border border-green-300' :
                            collectionRate >= 75 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            collectionRate >= 50 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                            'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {formatPercentage(collectionRate)}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && hasCollections && (
                        <tr className="bg-blue-50 border-b border-blue-200">
                          <td colSpan={7} className="py-4 px-6">
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                              <h4 className="font-bold text-gray-900 mb-3">Collections Breakdown for {month.month}</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Collection Name</th>
                                      <th className="text-center py-2 px-3 font-semibold text-gray-700">Frequency</th>
                                      <th className="text-center py-2 px-3 font-semibold text-gray-700">Due Date</th>
                                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Expected</th>
                                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Collected</th>
                                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Daily Fine</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {month.collectionsBreakdown.map((collection, idx) => (
                                      <tr key={idx} className="border-b border-gray-100">
                                        <td className="py-2 px-3 font-medium text-gray-900">{collection.collectionName}</td>
                                        <td className="py-2 px-3 text-center">
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            collection.frequency === 'monthly' ? 'bg-blue-100 text-blue-800' :
                                            collection.frequency === 'quarterly' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {collection.frequency}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-center text-gray-700">
                                          {new Date(collection.dueDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-900">
                                          {formatCurrency(collection.expectedAmount)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-semibold text-green-700">
                                          {formatCurrency(collection.collectedAmount)}
                                        </td>
                                        <td className="py-2 px-3 text-right text-red-700">
                                          {collection.dailyFine > 0 ? formatCurrency(collection.dailyFine) + '/day' : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300 font-bold">
                  <td className="py-4 px-4"></td>
                  <td className="py-4 px-4 text-gray-900 text-lg">TOTAL</td>
                  <td className="py-4 px-4 text-right text-gray-900 text-lg">
                    {formatCurrency(summary.summary.totalExpected)}
                  </td>
                  <td className="py-4 px-4 text-right text-green-700 text-lg">
                    {formatCurrency(summary.summary.totalCollected)}
                  </td>
                  <td className="py-4 px-4 text-right text-orange-700 text-lg">
                    {formatCurrency(summary.summary.totalOutstanding)}
                  </td>
                  <td className="py-4 px-4 text-right text-red-700 text-lg">
                    {formatCurrency(
                      summary.monthWiseData.reduce((sum, m) => sum + m.expectedFines, 0)
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      summary.summary.overallCollectionRate >= 90 ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                      summary.summary.overallCollectionRate >= 75 ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                      'bg-red-100 text-red-800 border-2 border-red-300'
                    }`}>
                      {formatPercentage(summary.summary.overallCollectionRate)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Financial Health Indicator */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Collection Efficiency</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatPercentage(summary.summary.overallCollectionRate)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    summary.summary.overallCollectionRate >= 90 ? 'bg-green-600' :
                    summary.summary.overallCollectionRate >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(summary.summary.overallCollectionRate, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-xs text-green-700 mb-1">Collected</div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(summary.summary.totalCollected)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {formatPercentage(summary.summary.overallCollectionRate)} of expected
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-xs text-orange-700 mb-1">Outstanding</div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(summary.summary.totalOutstanding)}
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {formatPercentage(summary.summary.totalExpected > 0 ? (summary.summary.totalOutstanding / summary.summary.totalExpected) * 100 : 0)} of expected
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="text-xs text-red-700 mb-1">Total Fines Exposure</div>
                <div className="text-2xl font-bold text-red-900">
                  {formatCurrency(summary.monthWiseData.reduce((sum, m) => sum + m.expectedFines, 0))}
                </div>
                <div className="text-xs text-red-600 mt-1">As of today</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
