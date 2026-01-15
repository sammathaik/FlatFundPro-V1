import { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, IndianRupee, CreditCard, Loader2, CheckCircle, AlertCircle, MessageCircle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PendingPayment {
  collection_id: string;
  collection_name: string;
  payment_type: string;
  payment_frequency: string;
  amount_due: number;
  balance: number;
  due_date: string;
  late_fee: number;
  overdue_days: number;
}

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: PendingPayment | null;
  flatId: string;
  apartmentId: string;
  blockId?: string;
  flatEmail: string;
  occupantName?: string;
  occupantMobile?: string;
  onSuccess?: () => void;
}

export default function QuickPaymentModal({
  isOpen,
  onClose,
  collection,
  flatId,
  apartmentId,
  blockId,
  flatEmail,
  occupantName,
  occupantMobile,
  onSuccess
}: QuickPaymentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (collection) {
      const totalPayable = collection.balance + (collection.late_fee || 0);
      setPaymentAmount(totalPayable.toString());
    }
  }, [collection]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }

      setScreenshot(file);
      setError(null);

      // For PDFs, don't try to show preview as image
      if (file.type === 'application/pdf') {
        setScreenshotPreview('PDF');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!collection) return;

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (!screenshot) {
      setError('Please upload a payment screenshot');
      return;
    }

    if (!paymentMode) {
      setError('Please select a payment mode');
      return;
    }

    setSubmitting(true);

    try {
      // Check for duplicate payment using the RPC function
      const { data: duplicateCheck, error: duplicateError } = await supabase.rpc(
        'check_duplicate_payment',
        {
          p_flat_id: flatId,
          p_expected_collection_id: collection.collection_id,
          p_email: flatEmail,
          p_mobile: occupantMobile || null
        }
      );

      if (duplicateError) {
        console.error('Error checking for duplicates:', duplicateError);
      }

      if (duplicateCheck && duplicateCheck > 0) {
        setError('A payment for this collection has already been submitted from this flat. Please check your transaction history or contact the administrator.');
        setSubmitting(false);
        return;
      }
      let screenshotUrl = null;

      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${flatId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        screenshotUrl = publicUrl;
      }

      // Get block_id if not provided
      let effectiveBlockId = blockId;
      if (!effectiveBlockId) {
        const { data: flatData } = await supabase
          .from('flat_numbers')
          .select('block_id')
          .eq('id', flatId)
          .maybeSingle();
        effectiveBlockId = flatData?.block_id;
      }

      if (!effectiveBlockId) {
        throw new Error('Could not determine building block');
      }

      // Use RPC function to bypass RLS issues
      const { data: paymentId, error: insertError } = await supabase
        .rpc('insert_payment_submission', {
          p_apartment_id: apartmentId,
          p_name: occupantName || flatEmail,
          p_block_id: effectiveBlockId,
          p_flat_id: flatId,
          p_email: flatEmail,
          p_screenshot_url: screenshotUrl,
          p_screenshot_filename: screenshot?.name || 'payment-proof',
          p_contact_number: occupantMobile || null,
          p_payment_amount: parseFloat(paymentAmount),
          p_payment_date: paymentDate,
          p_payment_type: collection.payment_type,
          p_occupant_type: null,
          p_expected_collection_id: collection.collection_id,
          p_payment_source: 'occupant_portal',
          p_transaction_reference: transactionRef || null,
          p_platform: paymentMode,
          p_status: 'Received',
          p_comments: `Payment for ${collection.collection_name}${whatsappOptIn ? ' (WhatsApp notifications enabled)' : ''}`
        });

      if (insertError) throw insertError;

      const insertedData = { id: paymentId };

      // Run image signals analysis asynchronously (non-blocking)
      if (insertedData?.id && screenshotUrl && screenshot) {
        const ImageSignalsService = (await import('../../lib/imageSignalsService')).ImageSignalsService;
        ImageSignalsService.analyzeImage(screenshotUrl, screenshot, insertedData.id)
          .then(analysis => {
            return ImageSignalsService.storeImageSignals(insertedData.id, screenshotUrl, analysis);
          })
          .catch(error => {
            console.warn('Image signals analysis failed (non-blocking):', error);
          });
      }

      setSuccess(true);

      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetForm();
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting payment:', err);
      setError(err.message || 'Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setTransactionRef('');
    setPaymentMode('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setWhatsappOptIn(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (!submitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen || !collection) return null;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
            <p className="text-gray-600">
              Your payment has been submitted successfully and is under review by the committee.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold">Submit Payment</h2>
            <p className="text-blue-100 text-sm mt-0.5">{collection.collection_name}</p>
            <p className="text-blue-200 text-xs mt-1">
              As: <span className="font-semibold">{occupantName || flatEmail}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-600 mb-0.5">Base Amount</p>
                <p className="text-lg font-bold text-gray-900">₹{collection.balance.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-600 mb-0.5">Due Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(collection.due_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {collection.late_fee > 0 && (
              <div className="bg-amber-100 border border-amber-300 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-900">Late Fee ({collection.overdue_days} days overdue)</p>
                    </div>
                  </div>
                  <p className="text-base font-bold text-amber-900">+₹{collection.late_fee.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-white">
                <p className="text-sm font-medium">Total Payable</p>
                <p className="text-xl font-bold">
                  ₹{(collection.balance + (collection.late_fee || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 appearance-none"
                  required
                >
                  <option value="">Select payment mode</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Transaction Ref (Optional)
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Transaction ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Payment Screenshot <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              disabled={submitting}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {screenshotPreview ? (
                <div className="space-y-2">
                  {screenshotPreview === 'PDF' ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 text-red-500" />
                      <p className="text-sm font-medium text-gray-700">{screenshot?.name}</p>
                    </div>
                  ) : (
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot"
                      className="max-h-32 mx-auto rounded-lg"
                    />
                  )}
                  <p className="text-xs text-blue-600 font-medium">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Upload Payment Proof</p>
                  <p className="text-xs text-gray-500">JPG, PNG or PDF (Max 5MB)</p>
                </div>
              )}
            </button>
          </div>

          {occupantMobile && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="font-semibold text-gray-900 text-xs">
                      Enable WhatsApp Reminders
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Get automated reminders on WhatsApp 7, 3, and 1 day before due dates
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="sticky bottom-0 bg-white flex gap-2 pt-3 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Submit Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
