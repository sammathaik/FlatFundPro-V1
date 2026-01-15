import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, Eye, Camera, FileImage, Hash } from 'lucide-react';
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

interface ImageSignalsInvestigationPanelProps {
  paymentSubmissionId: string;
  className?: string;
}

export default function ImageSignalsInvestigationPanel({
  paymentSubmissionId,
  className = ''
}: ImageSignalsInvestigationPanelProps) {
  const [signals, setSignals] = useState<ImageSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadImageSignals();
  }, [paymentSubmissionId]);

  async function loadImageSignals() {
    try {
      const { data, error } = await supabase
        .from('payment_image_signals')
        .select('*')
        .eq('payment_submission_id', paymentSubmissionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading image signals:', error);
      }

      setSignals(data || null);
    } catch (err) {
      console.error('Error loading image signals:', err);
    } finally {
      setLoading(false);
    }
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
              {hasAnyFlags ? 'Some flags detected - Review recommended' : 'All signals normal'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded ${hasAnyFlags ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Signal 1: Duplicate Detection */}
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

                {signals.duplicate_detected ? (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Similar Image Detected</span>
                    </div>
                    <div className="text-xs text-orange-800 space-y-1">
                      <p><strong>Similarity:</strong> {signals.similarity_percentage}%</p>
                      {signals.similar_to_payment_id && (
                        <p><strong>Previously seen in:</strong> Payment {signals.similar_to_payment_id.substring(0, 8)}...</p>
                      )}
                      <p className="mt-2 italic">{signals.similarity_explanation}</p>
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
