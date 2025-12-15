import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Download, Calendar, DollarSign, Percent, Building2, BarChart3, PieChart, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PaymentTrend {
  month: string;
  year: number;
  total_amount: number;
  payment_count: number;
}

interface ApartmentPerformance {
  apartment_id: string;
  apartment_name: string;
  total_collected: number;
  total_expected: number;
  collection_rate: number;
  payment_count: number;
}

interface CollectionEfficiency {
  collection_name: string;
  apartment_name: string;
  expected_amount: number;
  collected_amount: number;
  collection_rate: number;
  pending_amount: number;
}

export default function AnalyticsReports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last-6-months');
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrend[]>([]);
  const [apartmentPerformance, setApartmentPerformance] = useState<ApartmentPerformance[]>([]);
  const [collectionEfficiency, setCollectionEfficiency] = useState<CollectionEfficiency[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalCollected: 0,
    totalExpected: 0,
    collectionRate: 0,
    totalPayments: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      await Promise.all([
        loadPaymentTrends(),
        loadApartmentPerformance(),
        loadCollectionEfficiency(),
        loadTotalStats(),
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  }

  async function loadPaymentTrends() {
    const months = dateRange === 'last-6-months' ? 6 : dateRange === 'last-12-months' ? 12 : 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('payment_submissions')
      .select('payment_amount, payment_date')
      .gte('payment_date', startDate.toISOString())
      .order('payment_date', { ascending: true });

    if (error) {
      console.error('Error loading payment trends:', error);
      return;
    }

    const trendMap = new Map<string, { total: number; count: number }>();
    data?.forEach((payment) => {
      if (!payment.payment_date) return;
      const date = new Date(payment.payment_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = trendMap.get(key) || { total: 0, count: 0 };
      trendMap.set(key, {
        total: existing.total + (Number(payment.payment_amount) || 0),
        count: existing.count + 1,
      });
    });

    const trends = Array.from(trendMap.entries())
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: monthNames[parseInt(month) - 1],
          year: parseInt(year),
          total_amount: value.total,
          payment_count: value.count,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(a.month) -
          ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(b.month);
      });

    setPaymentTrends(trends);
  }

  async function loadApartmentPerformance() {
    const { data: apartments, error: apartmentError } = await supabase
      .from('apartments')
      .select('id, apartment_name');

    if (apartmentError) {
      console.error('Error loading apartments:', apartmentError);
      return;
    }

    const performance: ApartmentPerformance[] = [];

    for (const apartment of apartments || []) {
      const { data: payments } = await supabase
        .from('payment_submissions')
        .select('payment_amount')
        .eq('apartment_id', apartment.id);

      const { data: expected } = await supabase
        .from('expected_collections')
        .select('amount_due')
        .eq('apartment_id', apartment.id)
        .eq('is_active', true);

      const { data: flats } = await supabase
        .from('flat_numbers')
        .select('id')
        .in('block_id', (
          await supabase
            .from('buildings_blocks_phases')
            .select('id')
            .eq('apartment_id', apartment.id)
        ).data?.map(b => b.id) || []);

      const flatCount = flats?.length || 0;
      const totalCollected = payments?.reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0) || 0;
      const totalExpected = (expected || []).reduce((sum, e) => sum + (Number(e.amount_due) || 0), 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      performance.push({
        apartment_id: apartment.id,
        apartment_name: apartment.apartment_name,
        total_collected: totalCollected,
        total_expected: totalExpected,
        collection_rate: collectionRate,
        payment_count: payments?.length || 0,
      });
    }

    performance.sort((a, b) => b.collection_rate - a.collection_rate);
    setApartmentPerformance(performance);
  }

  async function loadCollectionEfficiency() {
    const { data: collections, error } = await supabase
      .from('expected_collections')
      .select(`
        id,
        collection_name,
        amount_due,
        is_active,
        apartment_id,
        apartments (apartment_name)
      `)
      .eq('is_active', true);

    if (error) {
      console.error('Error loading collections:', error);
      return;
    }

    const efficiency: CollectionEfficiency[] = [];

    for (const collection of collections || []) {
      const { data: flats } = await supabase
        .from('flat_numbers')
        .select('id')
        .in('block_id', (
          await supabase
            .from('buildings_blocks_phases')
            .select('id')
            .eq('apartment_id', collection.apartment_id)
        ).data?.map(b => b.id) || []);

      const flatCount = flats?.length || 0;

      const { data: payments } = await supabase
        .from('payment_submissions')
        .select('payment_amount')
        .eq('apartment_id', collection.apartment_id)
        .eq('expected_collection_id', collection.id);

      const expectedAmount = (Number(collection.amount_due) || 0) * flatCount;
      const collectedAmount = payments?.reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0) || 0;
      const collectionRate = expectedAmount > 0 ? (collectedAmount / expectedAmount) * 100 : 0;

      efficiency.push({
        collection_name: collection.collection_name || 'Unnamed Collection',
        apartment_name: (collection.apartments as any)?.apartment_name || '',
        expected_amount: expectedAmount,
        collected_amount: collectedAmount,
        collection_rate: collectionRate,
        pending_amount: expectedAmount - collectedAmount,
      });
    }

    efficiency.sort((a, b) => b.collection_rate - a.collection_rate);
    setCollectionEfficiency(efficiency);
  }

  async function loadTotalStats() {
    const { data: payments } = await supabase
      .from('payment_submissions')
      .select('payment_amount');

    const { data: expected } = await supabase
      .from('expected_collections')
      .select('amount_due, apartment_id')
      .eq('is_active', true);

    let totalExpected = 0;
    for (const exp of expected || []) {
      const { data: flats } = await supabase
        .from('flat_numbers')
        .select('id')
        .in('block_id', (
          await supabase
            .from('buildings_blocks_phases')
            .select('id')
            .eq('apartment_id', exp.apartment_id)
        ).data?.map(b => b.id) || []);

      const flatCount = flats?.length || 0;
      totalExpected += (Number(exp.amount_due) || 0) * flatCount;
    }

    const totalCollected = payments?.reduce((sum, p) => sum + (Number(p.payment_amount) || 0), 0) || 0;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    setTotalStats({
      totalCollected,
      totalExpected,
      collectionRate,
      totalPayments: payments?.length || 0,
    });
  }

  function exportToCSV() {
    let csvContent = 'Analytics Report - FlatFund Pro\n\n';

    csvContent += 'Payment Trends\n';
    csvContent += 'Month,Year,Total Amount,Payment Count\n';
    paymentTrends.forEach(trend => {
      csvContent += `${trend.month},${trend.year},${trend.total_amount},${trend.payment_count}\n`;
    });

    csvContent += '\nApartment Performance\n';
    csvContent += 'Apartment,Total Collected,Total Expected,Collection Rate,Payment Count\n';
    apartmentPerformance.forEach(apt => {
      csvContent += `${apt.apartment_name},${apt.total_collected},${apt.total_expected},${apt.collection_rate.toFixed(2)}%,${apt.payment_count}\n`;
    });

    csvContent += '\nCollection Efficiency\n';
    csvContent += 'Collection,Apartment,Expected Amount,Collected Amount,Collection Rate,Pending Amount\n';
    collectionEfficiency.forEach(col => {
      csvContent += `${col.collection_name},${col.apartment_name},${col.expected_amount},${col.collected_amount},${col.collection_rate.toFixed(2)}%,${col.pending_amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flatfund-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const maxTrendAmount = Math.max(...paymentTrends.map(t => t.total_amount), 1);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-600 mt-1">Comprehensive insights across all apartments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm border-none focus:outline-none focus:ring-0"
            >
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="last-12-months">Last 12 Months</option>
            </select>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Collected</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalStats.totalCollected.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Expected</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalStats.totalExpected.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <Percent className="w-8 h-8 text-amber-600" />
            {totalStats.collectionRate >= 75 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <p className="text-sm text-gray-600 font-medium">Collection Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.collectionRate.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Payments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.totalPayments.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Payment Trends</h3>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>

          {paymentTrends.length > 0 ? (
            <div className="space-y-3">
              {paymentTrends.map((trend, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{trend.month} {trend.year}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">₹{trend.total_amount.toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">({trend.payment_count})</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(trend.total_amount / maxTrendAmount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No payment data available</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Top Performing Apartments</h3>
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>

          {apartmentPerformance.length > 0 ? (
            <div className="space-y-4">
              {apartmentPerformance.slice(0, 5).map((apt, index) => (
                <div key={apt.apartment_id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <span className="font-semibold text-gray-900">{apt.apartment_name}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {apt.payment_count} payments
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${
                        apt.collection_rate >= 80 ? 'text-green-600' :
                        apt.collection_rate >= 60 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {apt.collection_rate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        apt.collection_rate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        apt.collection_rate >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${Math.min(apt.collection_rate, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>₹{apt.total_collected.toLocaleString()} collected</span>
                    <span>₹{apt.total_expected.toLocaleString()} expected</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No apartment data available</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Collection Efficiency by Type</h3>
          <PieChart className="w-5 h-5 text-gray-500" />
        </div>

        {collectionEfficiency.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Collection</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Apartment</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Expected</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Collected</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Pending</th>
                </tr>
              </thead>
              <tbody>
                {collectionEfficiency.slice(0, 10).map((col, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{col.collection_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{col.apartment_name}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">₹{col.expected_amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-green-600">₹{col.collected_amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        col.collection_rate >= 80 ? 'bg-green-100 text-green-800' :
                        col.collection_rate >= 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {col.collection_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-red-600">₹{col.pending_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No collection data available</p>
        )}
      </div>
    </div>
  );
}
