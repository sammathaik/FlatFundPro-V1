import React, { useState } from 'react';
import { Upload, Zap, AlertCircle, CheckCircle, Clock, FileText, TrendingUp, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OCRResult {
  google_vision: {
    text: string;
    confidence: number;
    processing_time_ms: number;
    error: string | null;
    text_length: number;
  };
  tesseract: {
    text: string;
    confidence: number;
    processing_time_ms: number;
    error: string | null;
    text_length: number;
  };
  fraud_signals: {
    hasAmount: boolean;
    hasTransactionRef: boolean;
    hasDate: boolean;
    hasStatusKeyword: boolean;
    hasPaymentKeyword: boolean;
    hasBankName: boolean;
    extractedAmount: number | null;
    extractedDate: string | null;
    extractedTransactionRef: string | null;
    paymentType: string | null;
    platform: string | null;
  };
  comparison: {
    winner: string;
    overall_confidence: number;
    fraud_risk_level: string;
  };
}

interface TestHistory {
  id: string;
  test_name: string;
  created_at: string;
  winner: string;
  overall_confidence_score: number;
  fraud_risk_level: string;
  google_vision_confidence: number;
  tesseract_confidence: number;
}

const OCRTestingPage = () => {
  const [testName, setTestName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string>('');
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setTestResult(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `ocr-tests/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const runOCRTest = async () => {
    if (!selectedFile || !testName.trim()) {
      setError('Please provide a test name and select an image');
      return;
    }

    setIsUploading(true);
    setIsTesting(true);
    setError('');
    setTestResult(null);

    try {
      const imageUrl = await uploadImage(selectedFile);
      setIsUploading(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/test-ocr-comparison`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_name: testName,
          image_url: imageUrl,
          file_type: selectedFile.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR test failed');
      }

      const result = await response.json();
      setTestResult(result.results);
      loadTestHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run OCR test');
    } finally {
      setIsUploading(false);
      setIsTesting(false);
    }
  };

  const loadTestHistory = async () => {
    const { data, error } = await supabase
      .from('ocr_test_results')
      .select('id, test_name, created_at, winner, overall_confidence_score, fraud_risk_level, google_vision_confidence, tesseract_confidence')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setTestHistory(data);
    }
  };

  React.useEffect(() => {
    loadTestHistory();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'NONE': return 'text-green-600 bg-green-50';
      case 'LOW': return 'text-yellow-600 bg-yellow-50';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50';
      case 'HIGH': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getWinnerBadge = (winner: string) => {
    switch (winner) {
      case 'google_vision': return { text: 'Google Vision', color: 'bg-blue-100 text-blue-700' };
      case 'tesseract': return { text: 'Tesseract', color: 'bg-purple-100 text-purple-700' };
      case 'tie': return { text: 'Tie', color: 'bg-gray-100 text-gray-700' };
      case 'both_failed': return { text: 'Both Failed', color: 'bg-red-100 text-red-700' };
      default: return { text: 'Unknown', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">OCR Testing Lab</h1>
              <p className="text-gray-600">Compare Google Vision API vs Tesseract OCR performance</p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>

          {showHistory && testHistory.length > 0 && (
            <div className="mb-8 bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Tests
              </h2>
              <div className="space-y-2">
                {testHistory.map((test) => {
                  const winner = getWinnerBadge(test.winner);
                  return (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{test.test_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(test.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${winner.color}`}>
                          {winner.text}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(test.fraud_risk_level)}`}>
                          {test.fraud_risk_level}
                        </span>
                        <span className="text-sm text-gray-600">
                          Confidence: {test.overall_confidence_score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Name
                  </label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g., PhonePe Screenshot Test"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Payment Screenshot
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, JPEG up to 10MB
                      </p>
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">{selectedFile.name}</p>
                        <p className="text-sm text-green-600">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <button
                  onClick={runOCRTest}
                  disabled={!selectedFile || !testName.trim() || isTesting}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {isUploading ? 'Uploading...' : 'Running OCR Tests...'}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Run OCR Comparison Test
                    </>
                  )}
                </button>
              </div>

              {previewUrl && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Image Preview</h3>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
            </div>

            {testResult && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Test Results
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Winner</p>
                      <p className={`text-lg font-bold px-3 py-1 rounded-full inline-block ${getWinnerBadge(testResult.comparison.winner).color}`}>
                        {getWinnerBadge(testResult.comparison.winner).text}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Fraud Risk</p>
                      <p className={`text-lg font-bold px-3 py-1 rounded-full inline-block ${getRiskColor(testResult.comparison.fraud_risk_level)}`}>
                        {testResult.comparison.fraud_risk_level}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-700">Google Vision API</h4>
                        <span className="text-sm text-gray-600">
                          {testResult.google_vision.processing_time_ms}ms
                        </span>
                      </div>
                      {testResult.google_vision.error ? (
                        <p className="text-red-600 text-sm">{testResult.google_vision.error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${testResult.google_vision.confidence}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-sm font-medium">{testResult.google_vision.confidence}%</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Extracted {testResult.google_vision.text_length} characters
                          </p>
                        </>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-700">Tesseract OCR</h4>
                        <span className="text-sm text-gray-600">
                          {testResult.tesseract.processing_time_ms}ms
                        </span>
                      </div>
                      {testResult.tesseract.error ? (
                        <p className="text-red-600 text-sm">{testResult.tesseract.error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600"
                                  style={{ width: `${testResult.tesseract.confidence}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-sm font-medium">{testResult.tesseract.confidence}%</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Extracted {testResult.tesseract.text_length} characters
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Detected Fraud Signals
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Amount', value: testResult.fraud_signals.hasAmount, extra: testResult.fraud_signals.extractedAmount ? `₹${testResult.fraud_signals.extractedAmount}` : null },
                      { label: 'Transaction Ref', value: testResult.fraud_signals.hasTransactionRef, extra: testResult.fraud_signals.extractedTransactionRef },
                      { label: 'Date', value: testResult.fraud_signals.hasDate, extra: testResult.fraud_signals.extractedDate },
                      { label: 'Status Keyword', value: testResult.fraud_signals.hasStatusKeyword },
                      { label: 'Payment Keyword', value: testResult.fraud_signals.hasPaymentKeyword },
                      { label: 'Bank Name', value: testResult.fraud_signals.hasBankName },
                    ].map((signal, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        {signal.value ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">{signal.label}</p>
                          {signal.extra && (
                            <p className="text-xs text-gray-500 truncate">{signal.extra}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {testResult.fraud_signals.paymentType && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Type:</strong> {testResult.fraud_signals.paymentType}
                        {testResult.fraud_signals.platform && ` • ${testResult.fraud_signals.platform}`}
                      </p>
                    </div>
                  )}
                </div>

                {!testResult.google_vision.error && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Google Vision Text</h4>
                    <div className="bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {testResult.google_vision.text || 'No text detected'}
                      </pre>
                    </div>
                  </div>
                )}

                {!testResult.tesseract.error && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Tesseract Text</h4>
                    <div className="bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {testResult.tesseract.text || 'No text detected'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRTestingPage;
