import { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import {
  getPaymentClassification,
  classifyPaymentDocument,
  getConfidenceLevelColor,
  getDocumentTypeIcon,
  type DocumentClassification,
} from '../../lib/documentClassification';

interface DocumentClassificationBadgeProps {
  paymentId: string;
  ocrText: string | null;
  compact?: boolean;
}

export default function DocumentClassificationBadge({
  paymentId,
  ocrText,
  compact = false,
}: DocumentClassificationBadgeProps) {
  const [classification, setClassification] = useState<DocumentClassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    loadClassification();
  }, [paymentId]);

  async function loadClassification() {
    setLoading(true);
    const data = await getPaymentClassification(paymentId);
    setClassification(data);
    setLoading(false);
  }

  async function handleClassify() {
    if (!ocrText || ocrText.length < 10) {
      alert('No extracted text available for classification. The payment must be analyzed first.');
      return;
    }

    setClassifying(true);
    const result = await classifyPaymentDocument(paymentId, ocrText);
    setClassifying(false);

    if (result.success) {
      await loadClassification();
      alert('Document classified successfully!');
    } else {
      alert(`Classification failed: ${result.error}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading classification...
      </div>
    );
  }

  if (!classification) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleClassify}
          disabled={!ocrText || classifying}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {classifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Classifying...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Classify Document
            </>
          )}
        </button>
        {!ocrText && (
          <span className="text-xs text-gray-500">No OCR text available</span>
        )}
      </div>
    );
  }

  const confidenceColor = getConfidenceLevelColor(classification.confidence_level);
  const documentIcon = getDocumentTypeIcon(classification.document_type);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${confidenceColor} cursor-pointer`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <span>{documentIcon}</span>
          <span>{classification.document_type}</span>
          <span className="text-xs opacity-75">({classification.confidence_level})</span>
        </div>
        {showDetails && (
          <div className="absolute z-10 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <ClassificationDetails classification={classification} onReClassify={handleClassify} classifying={classifying} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Document Classification
        </h4>
        <button
          onClick={handleClassify}
          disabled={classifying}
          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${classifying ? 'animate-spin' : ''}`} />
          Re-classify
        </button>
      </div>
      <ClassificationDetails classification={classification} onReClassify={handleClassify} classifying={classifying} />
    </div>
  );
}

function ClassificationDetails({
  classification,
  onReClassify,
  classifying,
}: {
  classification: DocumentClassification;
  onReClassify: () => void;
  classifying: boolean;
}) {
  const confidenceColor = getConfidenceLevelColor(classification.confidence_level);
  const documentIcon = getDocumentTypeIcon(classification.document_type);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{documentIcon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{classification.document_type}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
              {classification.confidence_level} ({classification.confidence_score}%)
            </span>
          </div>
          {classification.classification_reasoning && (
            <p className="text-sm text-gray-600">{classification.classification_reasoning}</p>
          )}
        </div>
      </div>

      {(classification.payment_method || classification.app_or_bank_name) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {classification.payment_method && (
            <div>
              <span className="text-gray-500">Method:</span>
              <span className="ml-2 font-medium">{classification.payment_method}</span>
            </div>
          )}
          {classification.app_or_bank_name && (
            <div>
              <span className="text-gray-500">App/Bank:</span>
              <span className="ml-2 font-medium">{classification.app_or_bank_name}</span>
            </div>
          )}
        </div>
      )}

      {classification.key_identifiers && Object.keys(classification.key_identifiers).length > 0 && (
        <div className="text-sm">
          <span className="text-gray-500">Key Identifiers:</span>
          <div className="mt-1 space-y-1">
            {Object.entries(classification.key_identifiers).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{key}:</span>
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>AI Model: {classification.ai_model_used}</span>
        </div>
        {classification.ai_processing_time_ms && (
          <span>{classification.ai_processing_time_ms}ms</span>
        )}
      </div>
    </div>
  );
}
