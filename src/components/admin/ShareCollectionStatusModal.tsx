import { useState, useEffect } from 'react';
import { X, Link2, Mail, MessageCircle, Eye, Copy, CheckCircle, Loader2, Send, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CollectionStatusGrid from './CollectionStatusGrid';

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

interface ShareCollectionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  apartmentId: string;
  apartmentName: string;
}

export default function ShareCollectionStatusModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  apartmentId,
  apartmentName,
}: ShareCollectionStatusModalProps) {
  const [step, setStep] = useState<'preview' | 'share'>('preview');
  const [loading, setLoading] = useState(false);
  const [flatStatuses, setFlatStatuses] = useState<FlatStatus[]>([]);
  const [shareCode, setShareCode] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatusPreview();
    } else {
      resetModal();
    }
  }, [isOpen, collectionId]);

  function resetModal() {
    setStep('preview');
    setShareCode('');
    setShareUrl('');
    setCopied(false);
    setSending(false);
    setSendResult(null);
  }

  async function loadStatusPreview() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_collection_status_summary', {
        p_expected_collection_id: collectionId,
      });

      if (error) throw error;
      setFlatStatuses(data || []);
    } catch (err) {
      console.error('Error loading status preview:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generateShareLink() {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_collection_share_link', {
        p_expected_collection_id: collectionId,
        p_apartment_id: apartmentId,
        p_expires_in_days: 30,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const share = data[0];
        setShareCode(share.share_code);
        const fullUrl = `${window.location.origin}/collection-status/${share.share_code}`;
        setShareUrl(fullUrl);
        setStep('share');
      }
    } catch (err) {
      console.error('Error generating share link:', err);
      alert('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function sendToResidents() {
    try {
      setSending(true);
      setSendResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-collection-status`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection_id: collectionId,
          apartment_id: apartmentId,
          share_code: shareCode,
          share_url: shareUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notifications');
      }

      setSendResult({
        sent: result.sent || 0,
        failed: result.failed || 0,
      });
    } catch (err) {
      console.error('Error sending to residents:', err);
      alert(err instanceof Error ? err.message : 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Share Collection Status</h2>
            <p className="text-sm text-gray-600">{collectionName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Preview Section */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Preview: What Residents Will See
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This visual summary shows payment status for each flat. Individual amounts
                  are NOT displayed to residents for privacy.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <CollectionStatusGrid flats={flatStatuses} showAmounts={false} showLegend={true} />
              )}

              {/* Information Box */}
              <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-200">
                <h4 className="font-semibold text-gray-900 mb-2">Important Notes</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• This status view is informational and non-judgmental</li>
                  <li>• Only approved payments are reflected in the status</li>
                  <li>• Individual payment amounts are hidden for privacy</li>
                  <li>• The shared link will expire in 30 days</li>
                  <li>• All communications are logged in the audit trail</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'share' && (
            <div className="space-y-6">
              {/* Share Link Section */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Share Link Generated Successfully
                </h3>
                <p className="text-sm text-gray-600">
                  Copy this link to share via any channel, or send directly to registered residents.
                </p>
              </div>

              {/* Copy Link */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </div>
              </div>

              {/* Send to Residents */}
              <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Send to All Registered Residents
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send this status update via Email and WhatsApp (opt-in only) to all registered
                  residents in {apartmentName}.
                </p>

                {sendResult ? (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 mb-4">
                    <p className="text-sm text-green-800">
                      <strong>Notifications Sent Successfully!</strong>
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Sent: {sendResult.sent} | Failed: {sendResult.failed}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={sendToResidents}
                    disabled={sending}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send to All Residents
                      </>
                    )}
                  </button>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email (All registered)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span>WhatsApp (Opt-in only)</span>
                  </div>
                </div>
              </div>

              {/* Preview Grid */}
              <details className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  View Status Grid
                </summary>
                <div className="mt-4">
                  <CollectionStatusGrid flats={flatStatuses} showAmounts={false} showLegend={false} />
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          {step === 'preview' && (
            <button
              onClick={generateShareLink}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  Generate Share Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
