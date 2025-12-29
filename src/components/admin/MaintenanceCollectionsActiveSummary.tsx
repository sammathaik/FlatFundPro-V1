import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, Info, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ExpectedCollection } from '../../lib/supabase';
import { exportToExcel, exportToCSV } from '../../lib/exportUtils';

type FlatData = {
  id: string;
  flat_number: string;
  flat_type: string | null;
  built_up_area: number | null;
  owner_name: string | null;
  block_id: string;
  block_name: string;
};

type OccupantDetails = {
  email: string | null;
  mobile: string | null;
  name: string | null;
  occupant_type: string | null;
};

type FlatCollectionStatus = {
  flat_id: string;
  flat_number: string;
  block_name: string;
  expected_amount: number;
  realised_amount: number;
  shortfall: number;
  statuses: string[];
  payment_count: number;
  owner_name: string | null;
  occupant_details: OccupantDetails | null;
};

type CollectionSummary = {
  collection: ExpectedCollection;
  total_expected: number;
  total_realised: number;
  total_shortfall: number;
  collection_percentage: number;
  flats: FlatCollectionStatus[];
};

type SortConfig = {
  key: keyof FlatCollectionStatus;
  direction: 'asc' | 'desc';
};

export default function MaintenanceCollectionsActiveSummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('India');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [sortConfigs, setSortConfigs] = useState<Record<string, SortConfig>>({});
  const [selectedFlat, setSelectedFlat] = useState<FlatCollectionStatus | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  useEffect(() => {
    loadApartmentId();
  }, []);

  useEffect(() => {
    if (apartmentId) {
      loadData();
    }
  }, [apartmentId]);

  async function loadApartmentId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('apartment_id, apartment:apartments(country)')
        .eq('user_id', user.id)
        .single();

      if (adminError) throw adminError;
      if (!adminData) throw new Error('Admin not found');

      setApartmentId(adminData.apartment_id);
      setCountry(adminData.apartment?.country || 'India');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function loadData() {
    if (!apartmentId) return;

    try {
      setLoading(true);
      setError(null);

      const [expectedRes, flatsRes, paymentsRes, occupantsRes] = await Promise.all([
        supabase
          .from('expected_collections')
          .select('*')
          .eq('apartment_id', apartmentId)
          .eq('is_active', true)
          .order('due_date', { ascending: false }),
        supabase
          .from('flat_numbers')
          .select('id, flat_number, flat_type, built_up_area, owner_name, block_id, buildings_blocks_phases!inner(block_name, apartment_id)')
          .eq('buildings_blocks_phases.apartment_id', apartmentId),
        supabase
          .from('payment_submissions')
          .select('flat_id, payment_amount, expected_collection_id, status')
          .eq('apartment_id', apartmentId),
        supabase
          .from('flat_email_mappings')
          .select('flat_id, email, mobile, name, occupant_type')
      ]);

      if (expectedRes.error) throw expectedRes.error;
      if (flatsRes.error) throw flatsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (occupantsRes.error) throw occupantsRes.error;

      const expectedCollections: ExpectedCollection[] = expectedRes.data || [];
      const flats: any[] = flatsRes.data || [];
      const payments: any[] = paymentsRes.data || [];
      const occupants: any[] = occupantsRes.data || [];

      const flatDataMap = new Map<string, FlatData>();
      flats.forEach(flat => {
        flatDataMap.set(flat.id, {
          id: flat.id,
          flat_number: flat.flat_number,
          flat_type: flat.flat_type,
          built_up_area: flat.built_up_area,
          owner_name: flat.owner_name,
          block_id: flat.block_id,
          block_name: flat.buildings_blocks_phases.block_name,
        });
      });

      const occupantMap = new Map<string, OccupantDetails>();
      occupants.forEach(occ => {
        occupantMap.set(occ.flat_id, {
          email: occ.email,
          mobile: occ.mobile,
          name: occ.name,
          occupant_type: occ.occupant_type,
        });
      });

      const collectionSummaries: CollectionSummary[] = expectedCollections.map(collection => {
        let total_expected = 0;
        let total_realised = 0;
        const flatStatuses: FlatCollectionStatus[] = [];

        flatDataMap.forEach(flat => {
          const expected = getExpectedAmountForFlat(collection, flat);

          const flatPayments = payments.filter(
            p => p.flat_id === flat.id &&
            p.expected_collection_id === collection.id
          );

          const realised = flatPayments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
          const shortfall = Math.max(0, expected - realised);

          const uniqueStatuses = [...new Set(flatPayments.map(p => p.status).filter(Boolean))];
          const paymentCount = flatPayments.length;

          total_expected += expected;
          total_realised += realised;

          flatStatuses.push({
            flat_id: flat.id,
            flat_number: flat.flat_number,
            block_name: flat.block_name,
            expected_amount: expected,
            realised_amount: realised,
            shortfall,
            statuses: uniqueStatuses,
            payment_count: paymentCount,
            owner_name: flat.owner_name,
            occupant_details: occupantMap.get(flat.id) || null,
          });
        });

        const total_shortfall = Math.max(0, total_expected - total_realised);
        const collection_percentage = total_expected > 0 ? (total_realised / total_expected) * 100 : 0;

        return {
          collection,
          total_expected,
          total_realised,
          total_shortfall,
          collection_percentage,
          flats: flatStatuses,
        };
      });

      setCollections(collectionSummaries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getExpectedAmountForFlat(
    collection: ExpectedCollection,
    flat: { flat_type: string | null; built_up_area: number | null }
  ): number {
    if (collection.flat_type_rates && flat.flat_type) {
      const rate = collection.flat_type_rates[flat.flat_type];
      if (rate !== undefined) {
        return rate;
      }
    }

    if (collection.rate_per_sqft && flat.built_up_area) {
      return collection.rate_per_sqft * flat.built_up_area;
    }

    return Number(collection.amount_due || 0);
  }

  function toggleCollection(collectionId: string) {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId);
    } else {
      newExpanded.add(collectionId);
    }
    setExpandedCollections(newExpanded);
  }

  function handleSort(collectionId: string, key: keyof FlatCollectionStatus) {
    const currentSort = sortConfigs[collectionId];
    const newDirection = currentSort?.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';

    setSortConfigs({
      ...sortConfigs,
      [collectionId]: { key, direction: newDirection }
    });
  }

  function getSortedFlats(collectionId: string, flats: FlatCollectionStatus[]): FlatCollectionStatus[] {
    const sortConfig = sortConfigs[collectionId];
    if (!sortConfig) return flats;

    return [...flats].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });
  }

  function showOwnerDetails(flat: FlatCollectionStatus) {
    setSelectedFlat(flat);
    setShowOwnerModal(true);
  }

  function formatCurrency(amount: number): string {
    const symbol = country === 'India' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getStatusColor(statuses: string[]): string {
    if (statuses.length === 0) return 'border-l-4 border-l-gray-300';
    if (statuses.includes('Approved')) return 'border-l-4 border-l-green-500';
    if (statuses.includes('Received')) return 'border-l-4 border-l-blue-500';
    if (statuses.includes('Reviewed')) return 'border-l-4 border-l-amber-500';
    return 'border-l-4 border-l-gray-300';
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Received':
        return 'bg-blue-100 text-blue-800';
      case 'Reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  async function handleExportExcel(summary: CollectionSummary) {
    const data = summary.flats.map(flat => ({
      'Block/Building': flat.block_name,
      'Flat Number': flat.flat_number,
      'Expected Amount': flat.expected_amount,
      'Realised Amount': flat.realised_amount,
      'Shortfall': flat.shortfall,
      'Status': flat.statuses.length > 0 ? flat.statuses.join(', ') : 'No Payment',
      'Payment Count': flat.payment_count,
    }));

    data.push({
      'Block/Building': 'TOTAL',
      'Flat Number': '',
      'Expected Amount': summary.total_expected,
      'Realised Amount': summary.total_realised,
      'Shortfall': summary.total_shortfall,
      'Status': '',
      'Payment Count': '',
    });

    const fileName = `${summary.collection.collection_name || 'Collection'}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(data, fileName);
  }

  async function handleExportCSV(summary: CollectionSummary) {
    const headers = ['Block/Building', 'Flat Number', 'Expected Amount', 'Realised Amount', 'Shortfall', 'Status', 'Payment Count'];
    const rows = summary.flats.map(flat => [
      flat.block_name,
      flat.flat_number,
      flat.expected_amount.toString(),
      flat.realised_amount.toString(),
      flat.shortfall.toString(),
      flat.statuses.length > 0 ? flat.statuses.join(', ') : 'No Payment',
      flat.payment_count.toString(),
    ]);

    rows.push([
      'TOTAL',
      '',
      summary.total_expected.toString(),
      summary.total_realised.toString(),
      summary.total_shortfall.toString(),
      '',
      '',
    ]);

    const fileName = `${summary.collection.collection_name || 'Collection'}_${new Date().toISOString().split('T')[0]}`;
    exportToCSV(headers, rows, fileName);
  }

  function handleExportPDF(summary: CollectionSummary) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${summary.collection.collection_name || 'Collection'} - Summary</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e3a8a; margin-bottom: 10px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #1e3a8a; color: white; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .total-row { font-weight: bold; background-color: #e5e7eb !important; }
          .summary { margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          .summary-label { font-weight: bold; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <h1>${summary.collection.collection_name || 'Collection'}</h1>
        <div class="meta">Generated on ${new Date().toLocaleString()}</div>

        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">Total Expected:</span> ${formatCurrency(summary.total_expected)}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Realised:</span> ${formatCurrency(summary.total_realised)}
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Shortfall:</span> ${formatCurrency(summary.total_shortfall)}
          </div>
          <div class="summary-item">
            <span class="summary-label">Collection:</span> ${summary.collection_percentage.toFixed(2)}%
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Block/Building</th>
              <th>Flat Number</th>
              <th>Expected Amount</th>
              <th>Realised Amount</th>
              <th>Shortfall</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${summary.flats.map(flat => `
              <tr>
                <td>${flat.block_name}</td>
                <td>${flat.flat_number}</td>
                <td>${formatCurrency(flat.expected_amount)}</td>
                <td>${formatCurrency(flat.realised_amount)}</td>
                <td>${formatCurrency(flat.shortfall)}</td>
                <td>${flat.statuses.length > 0 ? flat.statuses.join(', ') : 'No Payment'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td>${formatCurrency(summary.total_expected)}</td>
              <td>${formatCurrency(summary.total_realised)}</td>
              <td>${formatCurrency(summary.total_shortfall)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading collections...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Error loading data</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Collections – Active Summary</h1>
        <p className="text-gray-600">Monitor active maintenance collections across all billing cycles</p>
      </div>

      {collections.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Collections</h3>
          <p className="text-gray-600">There are currently no active collections to display.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {collections.map((summary) => {
            const isExpanded = expandedCollections.has(summary.collection.id);
            const sortedFlats = getSortedFlats(summary.collection.id, summary.flats);

            return (
              <div key={summary.collection.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCollection(summary.collection.id)}
                >
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      {summary.collection.collection_name || `${summary.collection.payment_type} - ${summary.collection.quarter} ${summary.collection.financial_year}`}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Due Date: {new Date(summary.collection.due_date).toLocaleDateString()} • {summary.flats.length} Flats
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${summary.collection_percentage >= 90 ? 'text-green-600' : summary.collection_percentage >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                        {summary.collection_percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Collected</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span>Total Expected</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_expected)}</div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>Total Realised</span>
                          </div>
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_realised)}</div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <TrendingDown className="w-4 h-4" />
                            <span>Total Shortfall</span>
                          </div>
                          <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_shortfall)}</div>
                        </div>

                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-2">Collection Progress</div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                summary.collection_percentage >= 90 ? 'bg-green-500' :
                                summary.collection_percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, summary.collection_percentage)}%` }}
                            />
                          </div>
                          <div className="text-sm font-semibold text-gray-700">{summary.collection_percentage.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Flat-wise Collection Details</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExportExcel(summary)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Excel
                          </button>
                          <button
                            onClick={() => handleExportPDF(summary)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleExportCSV(summary)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            CSV
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-800 sticky top-0 z-10">
                            <tr>
                              <th
                                className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleSort(summary.collection.id, 'block_name')}
                              >
                                Block/Building
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleSort(summary.collection.id, 'flat_number')}
                              >
                                Flat Number
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleSort(summary.collection.id, 'expected_amount')}
                              >
                                Expected Amount
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleSort(summary.collection.id, 'realised_amount')}
                              >
                                Realised Amount
                              </th>
                              <th
                                className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                                onClick={() => handleSort(summary.collection.id, 'shortfall')}
                              >
                                Shortfall
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sortedFlats.map((flat, index) => (
                              <tr
                                key={flat.flat_id}
                                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${getStatusColor(flat.statuses)}`}
                              >
                                <td className="px-4 py-3 text-sm text-gray-900">{flat.block_name}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{flat.flat_number}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(flat.expected_amount)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(flat.realised_amount)}</td>
                                <td className={`px-4 py-3 text-sm text-right font-semibold ${flat.shortfall > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {formatCurrency(flat.shortfall)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {flat.statuses.length === 0 ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                      No Payment
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {flat.statuses.map((status, idx) => (
                                        <span
                                          key={idx}
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(status)}`}
                                        >
                                          {status}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => showOwnerDetails(flat)}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    title="View Owner Details"
                                  >
                                    <Info className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr className="font-bold">
                              <td colSpan={2} className="px-4 py-4 text-sm text-gray-900 uppercase">Total</td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900">{formatCurrency(summary.total_expected)}</td>
                              <td className="px-4 py-4 text-sm text-right text-green-600">{formatCurrency(summary.total_realised)}</td>
                              <td className="px-4 py-4 text-sm text-right text-red-600">{formatCurrency(summary.total_shortfall)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total Expected</div>
                          <div className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_expected)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total Realised</div>
                          <div className="text-xl font-bold text-green-600">{formatCurrency(summary.total_realised)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Total Shortfall</div>
                          <div className="text-xl font-bold text-red-600">{formatCurrency(summary.total_shortfall)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="text-sm text-gray-600 mb-1">Collection %</div>
                          <div className="text-xl font-bold text-blue-600">{summary.collection_percentage.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showOwnerModal && selectedFlat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Flat Owner Details</h3>
              <button
                onClick={() => setShowOwnerModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Flat Number</div>
                <div className="text-lg font-bold text-gray-900">{selectedFlat.flat_number}</div>
                <div className="text-sm text-gray-600">{selectedFlat.block_name}</div>
              </div>

              {selectedFlat.owner_name && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Owner Name</div>
                  <div className="text-base font-semibold text-gray-900">{selectedFlat.owner_name}</div>
                </div>
              )}

              {selectedFlat.occupant_details && (
                <>
                  {selectedFlat.occupant_details.name && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Contact Person</div>
                      <div className="text-base font-semibold text-gray-900">{selectedFlat.occupant_details.name}</div>
                    </div>
                  )}

                  {selectedFlat.occupant_details.occupant_type && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Occupancy Type</div>
                      <div className="text-base font-semibold text-gray-900">{selectedFlat.occupant_details.occupant_type}</div>
                    </div>
                  )}

                  {selectedFlat.occupant_details.email && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Email Address</div>
                      <div className="text-base text-blue-600">{selectedFlat.occupant_details.email}</div>
                    </div>
                  )}

                  {selectedFlat.occupant_details.mobile && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Mobile Number</div>
                      <div className="text-base text-gray-900">{selectedFlat.occupant_details.mobile}</div>
                    </div>
                  )}
                </>
              )}

              {!selectedFlat.owner_name && !selectedFlat.occupant_details && (
                <div className="text-center py-4 text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No contact details available</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowOwnerModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
