import { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, IndianRupee, CreditCard, Loader2, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
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
  occupantEmail: string;
  occupantMobile?: string;
  onSuccess?: () => void;
}

export default function QuickPaymentModal({
  isOpen,
  onClose,
  collection,
  flatId,
  apartmentId,
  occupantEmail,
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

      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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

      const { error: insertError } = await supabase
        .from('payment_submissions')
        .insert({
          apartment_id: apartmentId,
          flat_id: flatId,
          expected_collection_id: collection.collection_id,
          name: occupantEmail,
          email: occupantEmail,
          mobile: occupantMobile || null,
          payment_amount: parseFloat(paymentAmount),
          payment_date: paymentDate,
          payment_type: collection.payment_type,
          payment_source: 'occupant_portal',
          transaction_reference: transactionRef || null,
          platform: paymentMode,
          screenshot_url: screenshotUrl,
          whatsapp_opt_in: whatsappOptIn,
          status: 'Received',
          comments: `Payment for ${collection.collection_name}`
        });

      if (insertError) throw insertError;

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
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Submit Payment</h2>
            <p className="text-blue-100 text-sm mt-1">{collection.collection_name}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Base Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{collection.balance.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(collection.due_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {collection.late_fee > 0 && (
              <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-900">Late Fee Applied</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      Payment is {collection.overdue_days} day{collection.overdue_days !== 1 ? 's' : ''} overdue.
                      Late fee has been added as per society rules.
                    </p>
                  </div>
                  <p className="text-lg font-bold text-amber-900">+₹{collection.late_fee.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm opacity-90">Total Payable</p>
                  <p className="text-xs opacity-75 mt-0.5">
                    {collection.late_fee > 0
                      ? `Base (₹${collection.balance.toLocaleString()}) + Late Fee (₹${collection.late_fee.toLocaleString()})`
                      : 'Outstanding balance'
                    }
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  ₹{(collection.balance + (collection.late_fee || 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={submitting}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={submitting}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Mode <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={submitting}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 appearance-none"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Transaction Reference (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              disabled={submitting}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              placeholder="Enter transaction/reference number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Screenshot <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={submitting}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {screenshotPreview ? (
                <div className="space-y-3">
                  <img
                    src={screenshotPreview}
                    alt="Payment screenshot"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-blue-600 font-medium">Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Upload Payment Screenshot</p>
                  <p className="text-xs text-gray-500">JPG, PNG (Max 5MB)</p>
                </div>
              )}
            </button>
          </div>

          {occupantMobile && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900 text-sm">
                      Enable WhatsApp Reminders
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Get automated payment reminders on WhatsApp at 7 days, 3 days, and 1 day before due dates
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
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
