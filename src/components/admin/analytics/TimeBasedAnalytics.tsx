import React, { useEffect, useState } from 'react';
import { Download, Calendar, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency, exportToCSV, exportToExcel, exportToPDF } from '../../../lib/exportUtils';

interface DayOfWeek {
  day: string;
  count: number;
  amount: number;
}

interface HourOfDay {
  hour: number;
  count: number;
}

interface BestMonth {
  month: string;
  amount: number;
}

interface TimeBasedAnalytics {
  paymentsByDayOfWeek: DayOfWeek[];
  paymentsByHourOfDay: HourOfDay[];
  bestCollectionMonth: BestMonth;
  worstCollectionMonth: BestMonth;
}

interface Props {
  buildingId: string;
}

export default function TimeBasedAnalytics({ buildingId }: Props) {
  const [data, setData] = useState<TimeBasedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadTimeBasedAnalytics();
  }, [buildingId, dateRange]);

  const loadTimeBasedAnalytics = async () => {
    try {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('get_time_based_analytics', {
        p_apartment_id: buildingId,
        p_start_date: dateRange.startDate,
        p_end_date: dateRange.endDate
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error loading time-based analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.paymentsByDayOfWeek) return;
    exportToCSV(data.paymentsByDayOfWeek, 'time_based_analytics');
  };

  const handleExportExcel = () => {
    if (!data?.paymentsByDayOfWeek) return;
    exportToExcel(data.paymentsByDayOfWeek, 'time_based_analytics');
  };

  const handleExportPDF = () => {
    exportToPDF('time-based-analytics-report', 'Time-Based Analytics Report');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const maxDayCount = data.paymentsByDayOfWeek
    ? Math.max(...data.paymentsByDayOfWeek.map(d => d.count), 1)
    : 1;

  const maxHourCount = data.paymentsByHourOfDay
    ? Math.max(...data.paymentsByHourOfDay.map(h => h.count), 1)
    : 1;

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const sortedDays = data.paymentsByDayOfWeek
    ? [...data.paymentsByDayOfWeek].sort((a, b) => {
        return dayOrder.indexOf(a.day.trim()) - dayOrder.indexOf(b.day.trim());
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Time-Based Analytics</h2>
          <p className="text-gray-600 mt-1">Discover payment patterns across time periods</p>
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

      <div id="time-based-analytics-report" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.bestCollectionMonth && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-green-600 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-green-700 font-medium">Best Collection Month</div>
                  <div className="text-2xl font-bold text-green-900">
                    {data.bestCollectionMonth.month}
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-green-900">
                {formatCurrency(data.bestCollectionMonth.amount)}
              </div>
            </div>
          )}

          {data.worstCollectionMonth && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-orange-600 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-orange-700 font-medium">Lowest Collection Month</div>
                  <div className="text-2xl font-bold text-orange-900">
                    {data.worstCollectionMonth.month}
                  </div>
                </div>
              </div>
              <div className="text-xl font-bold text-orange-900">
                {formatCurrency(data.worstCollectionMonth.amount)}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments by Day of Week</h3>
          {sortedDays && sortedDays.length > 0 ? (
            <div className="space-y-4">
              {sortedDays.map((day, index) => {
                const percentage = (day.count / maxDayCount) * 100;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 w-24">
                        {day.day.trim()}
                      </span>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-8 relative">
                          <div
                            className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage > 20 && (
                              <span className="text-xs font-medium text-white">
                                {day.count}
                              </span>
                            )}
                          </div>
                          {percentage <= 20 && (
                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-600">
                              {day.count}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 w-32 text-right">
                        {formatCurrency(day.amount)}
                      </span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Submissions by Hour of Day</h3>
          {data.paymentsByHourOfDay && data.paymentsByHourOfDay.length > 0 ? (
            <div className="space-y-2">
              {data.paymentsByHourOfDay.map((hour, index) => {
                const percentage = (hour.count / maxHourCount) * 100;
                const hourLabel = hour.hour === 0 ? '12 AM' :
                                  hour.hour < 12 ? `${hour.hour} AM` :
                                  hour.hour === 12 ? '12 PM' :
                                  `${hour.hour - 12} PM`;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-sm text-gray-600 font-medium">{hourLabel}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 10 && (
                            <span className="text-xs font-medium text-white">{hour.count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {percentage <= 10 && (
                      <div className="w-8 text-sm text-gray-600">{hour.count}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hourly data available</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Insights & Recommendations</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Send payment reminders during peak activity days for better response rates</li>
                <li>• Schedule important communications during high-engagement hours</li>
                <li>• Plan maintenance activities during low-payment activity periods</li>
                <li>• Use historical patterns to forecast upcoming collection periods</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
