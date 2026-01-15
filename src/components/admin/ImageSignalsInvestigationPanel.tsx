import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, Eye, Camera, FileImage, Hash, HelpCircle, ExternalLink, Building2, Home, Calendar, IndianRupee, FileCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageSignal {
  id: string;
  perceptual_hash: string | null;
  duplicate_detected: boolean;
  similar_to_payment_id: string | null;
  similarity_percentage: number | null;
  similarity_explanation: string | null;
  exif_available: boolean;
  exif_creation_date: string | null;
  exif_source_type: string | null;
  exif_metadata_stripped: boolean;
  exif_editor_detected: string | null;
  metadata_notes: string | null;
  looks_like_screenshot: boolean;
  aspect_ratio: string | null;
  resolution_width: number | null;
  resolution_height: number | null;
  text_density_score: number | null;
  screenshot_validity_explanation: string | null;
  analysis_status: string;
  analyzed_at: string | null;
}

interface DuplicateMatch {
  payment_id: string;
  apartment_name: string;
  block_name: string;
  flat_number: string;
  collection_name: string;
  payment_amount: number | null;
  payment_date: string | null;
  transaction_reference: string | null;
  status: string;
  submission_source: string;
  created_at: string;
}

interface ImageSignalsInvestigationPanelProps {
  paymentSubmissionId: string;
  className?: string;
}

export default function ImageSignalsInvestigationPanel({
  paymentSubmissionId,
  className = ''
}: ImageSignalsInvestigationPanelProps) {
  const [signals, setSignals] = useState<ImageSignal | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadImageSignals();
  }, [paymentSubmissionId]);

  async function loadImageSignals() {
    try {
      const { data, error } = await supabase
        .from('payment_image_signals')
        .select('*')
        .eq('payment_submission_id', paymentSubmissionId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading image signals:', error);
      }

      setSignals(data || null);

      if (data && data.duplicate_detected && data.perceptual_hash) {
        await loadDuplicateMatches(data.perceptual_hash);
      }
    } catch (err) {
      console.error('Error loading image signals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDuplicateMatches(perceptualHash: string) {
    try {
      const { data: hashMatch, error: hashError } = await supabase
        .from('image_perceptual_hash_index')
        .select('first_payment_id, upload_count')
        .eq('perceptual_hash', perceptualHash)
        .maybeSingle();

      if (hashError || !hashMatch) {
        console.error('Error loading hash matches:', hashError);
        return;
      }

      const { data: allPayments, error: allPaymentsError } = await supabase
        .from('payment_image_signals')
        .select('payment_submission_id')
        .eq('perceptual_hash', perceptualHash)
        .neq('payment_submission_id', paymentSubmissionId);

      if (allPaymentsError || !allPayments || allPayments.length === 0) {
        console.error('Error loading all payments with hash:', allPaymentsError);
        return;
      }

      const paymentIds = allPayments.map(p => p.payment_submission_id);

      if (paymentIds.length === 0) return;

      const { data: matches, error: matchesError } = await supabase
        .from('payment_submissions')
        .select(`
          id,
          payment_amount,
          payment_date,
          transaction_reference,
          status,
          submission_source,
          created_at,
          flat:flat_id(
            flat_number,
            block:block_id(
              block_name,
              apartment:apartment_id(
                apartment_name
              )
            )
          ),
          collection:expected_collection_id(
            collection_name
          )
        `)
        .in('id', paymentIds)
        .order('created_at', { ascending: false });

      if (matchesError) {
        console.error('Error loading duplicate matches:', matchesError);
        return;
      }

      const formattedMatches: DuplicateMatch[] = (matches || []).map((m: any) => ({
        payment_id: m.id,
        apartment_name: m.flat?.block?.apartment?.apartment_name || 'Unknown',
        block_name: m.flat?.block?.block_name || 'Unknown',
        flat_number: m.flat?.flat_number || 'Unknown',
        collection_name: m.collection?.collection_name || 'Unknown',
        payment_amount: m.payment_amount,
        payment_date: m.payment_date,
        transaction_reference: m.transaction_reference,
        status: m.status,
        submission_source: m.submission_source,
        created_at: m.created_at
      }));

      setDuplicateMatches(formattedMatches);
    } catch (err) {
      console.error('Error loading duplicate matches:', err);
    }
  }

  function handleViewSubmission(paymentId: string) {
    setSelectedPaymentId(paymentId);
    window.dispatchEvent(new CustomEvent('openPaymentReview', { detail: { paymentId } }));
  }

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading image signals...</span>
        </div>
      </div>
    );
  }

  if (!signals) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-blue-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">No image-level signals available for this submission</span>
        </div>
      </div>
    );
  }

  if (signals.analysis_status === 'failed') {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Image analysis was not completed</span>
        </div>
      </div>
    );
  }

  const hasAnyFlags = signals.duplicate_detected ||
                      !signals.looks_like_screenshot ||
                      signals.exif_editor_detected;

  return (
    <div className={`bg-white border-2 ${hasAnyFlags ? 'border-orange-300' : 'border-green-300'} rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasAnyFlags ? 'bg-orange-100' : 'bg-green-100'}`}>
            <Eye className={`w-5 h-5 ${hasAnyFlags ? 'text-orange-600' : 'text-green-600'}`} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">Image-Level Signals</h3>
            <p className="text-xs text-gray-500">
              {hasAnyFlags ? `${duplicateMatches.length > 0 ? `${duplicateMatches.length} duplicate(s) found - ` : ''}Review recommended` : 'All signals normal'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(!showHelp);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setShowHelp(!showHelp);
              }
            }}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            title="What do these signals mean?"
            aria-label="Toggle help information"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${hasAnyFlags ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {expanded ? 'Collapse' : 'Expand'}
          </span>
        </div>
      </button>

      {/* Help Panel */}
      {showHelp && (
        <div className="border-t border-gray-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Understanding Image-Level Signals</h4>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-medium">🔍 Duplicate / Similar Image Detection</p>
                  <p className="text-xs mt-1">The system checks if the same or very similar screenshot has been uploaded before. This helps identify reused payment proofs. <strong>Important:</strong> Similar images do NOT always mean fraud - residents may legitimately submit the same proof multiple times or make corrections. Admin judgment is required.</p>
                </div>
                <div>
                  <p className="font-medium">📄 Image Metadata Consistency</p>
                  <p className="text-xs mt-1">Metadata (EXIF data) is checked when available in the image. Missing or stripped metadata is very common for screenshots and mobile uploads. <strong>Metadata alone is NOT proof of wrongdoing</strong> - it's an informational signal only.</p>
                </div>
                <div>
                  <p className="font-medium">📱 Screenshot Validity Heuristics</p>
                  <p className="text-xs mt-1">The system checks whether the image looks like a typical mobile payment screenshot (aspect ratio, resolution, etc.). Unusual formats may need closer review but can be legitimate (tablets, cropped images, etc.).</p>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <p className="font-bold text-blue-900">⚖️ Important Disclaimer</p>
                  <p className="text-xs mt-1">These signals <strong>assist review only</strong>. They do NOT confirm fraud and do NOT auto-reject payments. <strong>Final decisions always rest with Admin/Committee</strong> based on full context and investigation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Signal 1: Duplicate Detection with Full Context */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <Hash className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  1. Duplicate / Similar Image Detection
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  Checks if this image has been submitted before using perceptual hashing
                </p>

                {signals.duplicate_detected && duplicateMatches.length > 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">
                        This image appears in {duplicateMatches.length} other submission{duplicateMatches.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="text-xs text-orange-800 mb-2">
                      <p><strong>Match Type:</strong> {signals.similarity_percentage === 100 ? 'Exact Duplicate' : `Similar (${signals.similarity_percentage}% match)`}</p>
                      <p className="mt-1 italic">{signals.similarity_explanation}</p>
                    </div>

                    {/* Duplicate Matches Table */}
                    <div className="bg-white rounded border border-orange-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-orange-100 border-b border-orange-200">
                            <tr>
                              <th className="text-left p-2 font-semibold text-orange-900">Apartment</th>
                              <th className="text-left p-2 font-semibold text-orange-900">Block</th>
                              <th className="text-left p-2 font-semibold text-orange-900">Flat</th>
                              <th className="text-left p-2 font-semibold text-orange-900">Collection</th>
                              <th className="text-right p-2 font-semibold text-orange-900">Amount</th>
                              <th className="text-left p-2 font-semibold text-orange-900">Date</th>
                              <th className="text-left p-2 font-semibold text-orange-900">Status</th>
                              <th className="text-center p-2 font-semibold text-orange-900">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {duplicateMatches.map((match, index) => (
                              <tr
                                key={match.payment_id}
                                className={`border-b border-orange-100 hover:bg-orange-50 ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}`}
                              >
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-900">{match.apartment_name}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-gray-700">{match.block_name}</td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    <Home className="w-3 h-3 text-gray-500" />
                                    <span className="font-medium text-gray-900">{match.flat_number}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-gray-700">{match.collection_name}</td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <IndianRupee className="w-3 h-3 text-gray-500" />
                                    <span className="font-medium text-gray-900">
                                      {match.payment_amount ? match.payment_amount.toLocaleString() : 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-500" />
                                    <span className="text-gray-700">
                                      {match.payment_date ? new Date(match.payment_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    match.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                    match.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    <FileCheck className="w-3 h-3" />
                                    {match.status}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleViewSubmission(match.payment_id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
                                    title="View this submission"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="text-xs text-orange-700 italic pt-2 border-t border-orange-200">
                      ⚠️ <strong>Review Required:</strong> Investigate why the same image appears multiple times. This may be legitimate (correction, resubmission) or require further investigation.
                    </div>
                  </div>
                ) : signals.duplicate_detected ? (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Similar Image Detected</span>
                    </div>
                    <div className="text-xs text-orange-800 space-y-1 mt-2">
                      <p><strong>Similarity:</strong> {signals.similarity_percentage}%</p>
                      {signals.similar_to_payment_id && (
                        <p><strong>Previously seen in:</strong> Payment {signals.similar_to_payment_id.substring(0, 8)}...</p>
                      )}
                      <p className="mt-2 italic">{signals.similarity_explanation}</p>
                      <p className="mt-2 text-yellow-700">⚠️ Unable to load full context for this match</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">No duplicate detected</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">{signals.similarity_explanation || 'This image appears to be unique'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Signal 2: Metadata Consistency */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <FileImage className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  2. Image Metadata Consistency
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  Lightweight EXIF metadata analysis (informational only - absence is NOT fraud)
                </p>

                <div className={`border rounded p-3 space-y-2 ${
                  signals.exif_editor_detected
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">EXIF Available:</span>
                      <span className={`ml-2 ${signals.exif_available ? 'text-green-700' : 'text-gray-500'}`}>
                        {signals.exif_available ? 'Yes' : 'No (common for screenshots)'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Source Type:</span>
                      <span className="ml-2 text-gray-900 capitalize">{signals.exif_source_type || 'Unknown'}</span>
                    </div>
                    {signals.exif_creation_date && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(signals.exif_creation_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {signals.exif_editor_detected && (
                      <div className="col-span-2">
                        <span className="font-medium text-yellow-700">Editor Detected:</span>
                        <span className="ml-2 text-yellow-900">{signals.exif_editor_detected}</span>
                      </div>
                    )}
                  </div>

                  {signals.metadata_notes && (
                    <p className="text-xs text-gray-700 pt-2 border-t border-gray-300 italic">
                      {signals.metadata_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signal 3: Screenshot Validity */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <Camera className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  3. Screenshot Validity Heuristics
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  Simple checks for typical mobile payment screenshot characteristics
                </p>

                <div className={`border rounded p-3 space-y-2 ${
                  signals.looks_like_screenshot
                    ? 'bg-green-50 border-green-200'
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {signals.looks_like_screenshot ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Looks like a mobile screenshot</span>
                      </>
                    ) : (
                      <>
                        <Info className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Unusual format detected</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Aspect Ratio:</span>
                      <span className="ml-2 text-gray-900">{signals.aspect_ratio || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Resolution:</span>
                      <span className="ml-2 text-gray-900">
                        {signals.resolution_width} × {signals.resolution_height}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Text Density:</span>
                      <span className="ml-2 text-gray-900">{signals.text_density_score || 0}/100</span>
                    </div>
                  </div>

                  {signals.screenshot_validity_explanation && (
                    <p className="text-xs text-gray-700 pt-2 border-t border-gray-300 italic">
                      {signals.screenshot_validity_explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Metadata */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <p>
              <strong>Analysis completed:</strong>{' '}
              {signals.analyzed_at ? new Date(signals.analyzed_at).toLocaleString() : 'Unknown'}
            </p>
            <p className="mt-1 text-gray-400">
              These signals are assistive and informational only. They do not automatically block or reject payments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
