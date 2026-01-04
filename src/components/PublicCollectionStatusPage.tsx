import { useState, useEffect } from 'react';
import { Calendar, Building2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollectionStatusGrid from './admin/CollectionStatusGrid';
import { formatDate } from '../lib/utils';

interface CollectionData {
  collection_id: string;
  collection_name: string;
  apartment_name: string;
  payment_type: string;
  due_date: string;
  amount_due: number;
  financial_year: string;
  quarter: string;
  is_active: boolean;
  share_expires_at: string | null;
}

interface FlatStatus {
  building_name: string;
  flat_number: string;
  flat_id: string;
  occupant_name: string;
  payment_status: 'paid' | 'underpaid' | 'overpaid' | 'unpaid';
  total_paid: number;
  amount_due: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
}

interface PublicCollectionStatusPageProps {
  shareCode: string;
}

export default function PublicCollectionStatusPage({ shareCode }: PublicCollectionStatusPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState<CollectionData | null>(null);
  const [flatStatuses, setFlatStatuses] = useState<FlatStatus[]>([]);

  useEffect(() => {
    loadCollectionStatus();
  }, [shareCode]);

  async function loadCollectionStatus() {
    try {
      setLoading(true);
      setError(null);

      // Get collection details using share code
      const { data: shareData, error: shareError } = await supabase.rpc(
        'get_collection_share_data',
        { p_share_code: shareCode }
      );

      if (shareError) throw shareError;

      if (!shareData || shareData.length === 0) {
        setError('This link is invalid or has expired.');
        return;
      }

      const collection = shareData[0];
      setCollectionData(collection);

      // Get status summary for all flats
      const { data: statusData, error: statusError } = await supabase.rpc(
        'get_collection_status_summary',
        { p_expected_collection_id: collection.collection_id }
      );

      if (statusError) throw statusError;

      setFlatStatuses(statusData || []);
    } catch (err) {
      console.error('Error loading collection status:', err);
      setError('Failed to load collection status. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading collection status...</p>
        </div>
      </div>
    );
  }

  if (error || !collectionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Status</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your society committee.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = collectionData.share_expires_at && new Date(collectionData.share_expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Building2 className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {collectionData.apartment_name}
              </h1>
              <p className="text-sm text-gray-600">Collection Payment Status</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Collection Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {collectionData.collection_name}
            </h2>
            {!collectionData.is_active && (
              <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold">
                Inactive
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm text-gray-600">Due Date</div>
                <div className="font-semibold text-gray-900">{formatDate(collectionData.due_date)}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Financial Year</div>
              <div className="font-semibold text-gray-900">{collectionData.financial_year}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Quarter</div>
              <div className="font-semibold text-gray-900">{collectionData.quarter}</div>
            </div>
          </div>

          {isExpired && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This shared link has expired. Status shown may not be current.
              </p>
            </div>
          )}
        </div>

        {/* Status Grid */}
        <CollectionStatusGrid flats={flatStatuses} showAmounts={false} showLegend={true} />

        {/* Information Box */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <h3 className="font-bold text-gray-900 mb-3">About This Status View</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              This status view helps keep all residents informed about the collection progress
              in a transparent manner.
            </p>
            <p>
              The information shown here reflects approved payments only. Pending submissions
              are under committee review.
            </p>
            <p>
              For privacy, individual payment amounts are not displayed. Only status indicators
              are shown.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Powered by <strong>FlatFund Pro</strong>
          </p>
          <p className="text-xs text-gray-400">
            Payment governance built for accountability
          </p>
        </div>
      </main>
    </div>
  );
}
