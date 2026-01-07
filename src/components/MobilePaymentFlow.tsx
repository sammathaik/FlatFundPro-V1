import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Loader2,
  Home,
  Upload,
  Calendar,
  IndianRupee,
  User,
  Building,
  MapPin,
  Clock,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MobileNumberInput from './MobileNumberInput';
import { normalizeMobileNumber } from '../lib/mobileNumberUtils';

type FlowStep = 'mobile' | 'flat-selection' | 'otp' | 'payment' | 'history' | 'success';

interface FlatInfo {
  flat_id: string;
  apartment_id: string;
  apartment_name: string;
  block_id: string;
  block_name: string;
  flat_number: string;
  occupant_name: string | null;
  occupant_type: 'Owner' | 'Tenant';
  email: string;
  mobile: string;
}

interface PaymentSession {
  mapping_id: string;
  apartment_id: string;
  apartment_name: string;
  apartment_country: string;
  block_id: string;
  block_name: string;
  flat_id: string;
  flat_number: string;
  flat_type: string | null;
  built_up_area: number | null;
  name: string | null;
  email: string;
  mobile: string;
  occupant_type: 'Owner' | 'Tenant';
}

interface PaymentHistory {
  id: string;
  payment_amount: number;
  payment_date: string;
  payment_type: string;
  payment_quarter: string;
  status: string;
  created_at: string;
  collection_name: string | null;
}

interface ActiveCollection {
  id: string;
  collection_name: string;
  payment_type: string;
  amount_due: number | null;
  due_date: string;
}

interface MobilePaymentFlowProps {
  onBack: () => void;
}

export default function MobilePaymentFlow({ onBack }: MobilePaymentFlowProps) {
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<FlowStep>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [discoveredFlats, setDiscoveredFlats] = useState<FlatInfo[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<FlatInfo | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(''); // For testing
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [activeCollections, setActiveCollections] = useState<ActiveCollection[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debug: Log step changes
  useEffect(() => {
    console.log('🔄 STEP CHANGED TO:', step);
  }, [step]);

  // Auto-focus OTP input when step changes to 'otp'
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      console.log('🎯 OTP step detected, focusing input...');
      setTimeout(() => {
        otpInputRef.current?.focus();
        otpInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [step]);

  // Payment form state
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  // Step 1: Discover flats by mobile number
  const handleDiscoverFlats = async () => {
    const normalized = normalizeMobileNumber(mobileNumber);

    if (!normalized.localNumber || normalized.localNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try with full number first, then with local number only
      let data, rpcError;

      // First attempt with the full number format
      const result1 = await supabase.rpc('discover_flats_by_mobile', {
        mobile_number: mobileNumber
      });

      if (result1.error || (result1.data as any)?.count === 0) {
        // Try with just the local number (without country code)
        const result2 = await supabase.rpc('discover_flats_by_mobile', {
          mobile_number: normalized.localNumber
        });
        data = result2.data;
        rpcError = result2.error;
      } else {
        data = result1.data;
        rpcError = result1.error;
      }

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; count: number; flats: FlatInfo[] };

      if (!result.success) {
        setError('Unable to discover flats. Please try again.');
        return;
      }

      if (result.count === 0) {
        setError('No flats found linked to this mobile number. You can proceed with manual entry or contact your admin.');
        setDiscoveredFlats([]);
        // User can still go back and use manual entry
        return;
      }

      setDiscoveredFlats(result.flats);

      if (result.count === 1) {
        // Auto-select the single flat and proceed to OTP
        setSelectedFlat(result.flats[0]);
        const success = await generateOtp(result.flats[0]);
        if (success) {
          setStep('otp');
        }
      } else {
        // Multiple flats found, show selection screen
        setStep('flat-selection');
      }
    } catch (err) {
      console.error('Error discovering flats:', err);
      setError('Failed to discover flats. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate OTP for selected flat
  const generateOtp = async (flat: FlatInfo): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedOtp(''); // Clear previous OTP

    try {
      const normalized = normalizeMobileNumber(mobileNumber);

      // Use the mobile number from the flat data to ensure consistency
      const mobileToUse = flat.mobile || normalized.localNumber;

      const { data, error: rpcError } = await supabase.rpc('generate_mobile_otp', {
        mobile_number: mobileToUse,
        p_flat_id: flat.flat_id
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      if (!data) {
        throw new Error('No data returned from generate_mobile_otp');
      }

      const result = data as { success: boolean; otp?: string; message: string; error?: string };

      if (!result.success) {
        setError(result.message || result.error || 'Failed to generate OTP');
        return false;
      }

      // Store OTP for testing (remove in production)
      if (result.otp) {
        setGeneratedOtp(result.otp);
        console.log('OTP generated successfully:', result.otp);
      }

      setSuccessMessage('OTP sent successfully!');
      return true;
    } catch (err: any) {
      console.error('Error generating OTP:', err);
      setError(err.message || 'Failed to generate OTP. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalized = normalizeMobileNumber(mobileNumber);
      // Use the mobile number from selected flat to ensure consistency
      const mobileToUse = selectedFlat?.mobile || normalized.localNumber;

      const { data, error: rpcError } = await supabase.rpc('verify_mobile_otp_for_payment', {
        mobile_number: mobileToUse,
        otp_code: otpCode
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; session?: PaymentSession; message: string; error?: string };

      if (!result.success) {
        setError(result.message);
        return;
      }

      if (result.session) {
        setSession(result.session);
        await loadPaymentHistory(result.session.flat_id, result.session.apartment_id);
        await loadActiveCollections(result.session.apartment_id);
        setStep('history');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load payment history
  const loadPaymentHistory = async (flatId: string, apartmentId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_resident_payment_history', {
        p_flat_id: flatId,
        p_apartment_id: apartmentId,
        p_limit: 5
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; payments: PaymentHistory[] };
      if (result.success) {
        setPaymentHistory(result.payments);
      }
    } catch (err) {
      console.error('Error loading payment history:', err);
    }
  };

  // Load active collections
  const loadActiveCollections = async (apartmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('expected_collections')
        .select('id, collection_name, payment_type, amount_due, due_date')
        .eq('apartment_id', apartmentId)
        .eq('is_active', true)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setActiveCollections(data || []);
    } catch (err) {
      console.error('Error loading collections:', err);
    }
  };

  // Submit payment
  const handleSubmitPayment = async () => {
    if (!session || !screenshot) {
      setError('Please upload payment proof');
      return;
    }

    if (!selectedCollectionId) {
      setError('Please select a collection type');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload screenshot first
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${session.flat_id}_${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Submit payment using secure RPC function (bypasses RLS issues)
      const { data: submitResult, error: submitError } = await supabase
        .rpc('submit_mobile_payment', {
          p_apartment_id: session.apartment_id,
          p_block_id: session.block_id,
          p_flat_id: session.flat_id,
          p_name: session.name || 'Resident',
          p_email: session.email || '',
          p_contact_number: session.mobile,
          p_payment_amount: parseFloat(paymentAmount),
          p_payment_date: paymentDate,
          p_screenshot_url: publicUrl,
          p_screenshot_filename: fileName,
          p_transaction_reference: transactionRef || null,
          p_expected_collection_id: selectedCollectionId,
          p_occupant_type: session.occupant_type || 'Owner',
          p_payment_source: 'Mobile Submission'
        });

      if (submitError) {
        console.error('RPC Error:', submitError);
        throw new Error(submitError.message || 'Failed to submit payment');
      }

      if (!submitResult || !submitResult.success) {
        const errorMsg = submitResult?.error || 'Payment submission failed';
        setError(errorMsg);
        setSubmitting(false);
        return;
      }

      const insertData = {
        id: submitResult.payment_id,
        created_at: new Date().toISOString()
      };

      // Update WhatsApp opt-in and send acknowledgment
      try {
        // Update WhatsApp opt-in preference using secure RPC function
        const { data: updateSuccess, error: updateError } = await supabase.rpc(
          'update_mobile_payment_whatsapp_preference',
          {
            p_apartment_id: session.apartment_id,
            p_flat_number: session.flat_number,
            p_whatsapp_opt_in: whatsappOptIn
          }
        );

        if (updateError) {
          console.error('Failed to update WhatsApp preference:', updateError);
          // Don't block payment submission if this fails
        }

        // Find the selected collection for details
        const selectedCollection = activeCollections.find(c => c.id === selectedCollectionId);

        // Call acknowledgment function
        const acknowledgmentPayload = {
          email: session.email || '',
          mobile: session.mobile,
          name: session.name || 'Resident',
          flat_number: session.flat_number,
          apartment_name: session.apartment_name,
          apartment_id: session.apartment_id,
          payment_id: insertData.id,
          payment_type: selectedCollection?.payment_type || 'maintenance',
          payment_amount: parseFloat(paymentAmount),
          payment_quarter: selectedCollection?.collection_name || null,
          submission_date: insertData.created_at,
          whatsapp_optin: whatsappOptIn
        };

        const { data: ackResponse } = await supabase.functions.invoke('send-payment-acknowledgment', {
          body: acknowledgmentPayload
        });

        console.log('Acknowledgment sent:', ackResponse);
      } catch (ackError) {
        console.error('Error sending acknowledgment (non-blocking):', ackError);
        // Non-blocking - continue even if acknowledgment fails
      }

      setStep('success');
    } catch (err: any) {
      console.error('Error submitting payment:', err);
      setError(err.message || 'Failed to submit payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMobileEntry = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
        <p className="text-gray-600">Enter your registered mobile number to continue</p>
      </div>

      <div className="space-y-4">
        <MobileNumberInput
          value={mobileNumber}
          onChange={(value) => {
            setMobileNumber(value);
            setError(null);
          }}
          onSubmit={handleDiscoverFlats}
        />

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800">{error}</p>
              <button
                onClick={onBack}
                className="text-sm text-yellow-700 underline mt-2 hover:text-yellow-900"
              >
                Use manual entry instead
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleDiscoverFlats}
          disabled={loading || !mobileNumber || normalizeMobileNumber(mobileNumber).localNumber.length !== 10}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Searching...
            </>
          ) : (
            'Continue'
          )}
        </button>

        <button
          onClick={onBack}
          className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
        >
          Back to options
        </button>
      </div>
    </div>
  );

  const handleSelectFlat = async (flat: FlatInfo) => {
    console.log('🎯 ===== FLAT CLICKED =====');
    console.log('Current loading state:', loading);
    console.log('Flat data:', {
      flat_number: flat.flat_number,
      apartment: flat.apartment_name,
      flat_id: flat.flat_id,
      mobile: flat.mobile
    });

    setSelectedFlat(flat);
    setError(null);
    setSuccessMessage(null);

    console.log('🔐 About to call generateOtp...');
    const success = await generateOtp(flat);
    console.log('📊 generateOtp returned:', success);

    // Only proceed to OTP step if OTP was generated successfully
    if (success) {
      console.log('✅ Success! Changing step to "otp"');
      setStep('otp'); // Set step after OTP is generated so useEffect can focus
      console.log('✅ Step changed to:', 'otp');
    } else {
      console.error('❌ Failed! Not changing step');
    }
    console.log('🎯 ===== FLAT CLICK COMPLETE =====');
  };

  const renderFlatSelection = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setStep('mobile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Select Your Flat</h2>
        <p className="text-gray-600">We found multiple flats linked to your mobile number</p>
      </div>

      <div className="space-y-3">
        {discoveredFlats.map((flat) => (
          <button
            key={flat.flat_id}
            onClick={() => {
              console.log('🖱️ BUTTON CLICKED for flat:', flat.flat_number);
              console.log('Button disabled?', loading);
              handleSelectFlat(flat);
            }}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Home className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-gray-800">{flat.flat_number}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {flat.occupant_type}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{flat.apartment_name}</p>
                <p className="text-sm text-gray-500">{flat.block_name}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-gray-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderOtpVerification = () => (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => {
            setError(null);
            setSuccessMessage(null);
            setStep(discoveredFlats.length > 1 ? 'flat-selection' : 'mobile');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Enter OTP</h2>
        <p className="text-gray-600">
          We've sent a 6-digit code to {mobileNumber}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {generatedOtp && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-blue-800 font-semibold text-center text-lg">
            Development Mode: Your OTP is <span className="text-2xl font-bold tracking-wider">{generatedOtp}</span>
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <input
            ref={otpInputRef}
            type="text"
            maxLength={6}
            value={otpCode}
            onChange={(e) => {
              setOtpCode(e.target.value.replace(/\D/g, ''));
              setError(null);
            }}
            placeholder="Enter 6-digit OTP"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={loading || otpCode.length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Continue'
          )}
        </button>

        <button
          onClick={() => selectedFlat && generateOtp(selectedFlat)}
          disabled={loading}
          className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );

  const renderPaymentHistory = () => (
    <div className="space-y-6">
      {session && (
        <>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <p className="text-blue-100 text-sm mb-1">Welcome back!</p>
            <h2 className="text-2xl font-bold mb-4">
              {session.name || 'Resident'}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-100">Flat</p>
                <p className="font-semibold">{session.flat_number}</p>
              </div>
              <div>
                <p className="text-blue-100">Type</p>
                <p className="font-semibold">{session.occupant_type}</p>
              </div>
              <div className="col-span-2">
                <p className="text-blue-100">Apartment</p>
                <p className="font-semibold">{session.apartment_name}</p>
              </div>
            </div>
          </div>

          {paymentHistory.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Payments</h3>
              <div className="space-y-2">
                {paymentHistory.slice(0, 3).map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {payment.collection_name || payment.payment_type}
                      </p>
                      <p className="text-xs text-gray-500">{payment.payment_quarter}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">
                        ₹{payment.payment_amount.toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        payment.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        payment.status === 'Received' ? 'bg-blue-100 text-blue-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('payment')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            Submit New Payment
          </button>

          <button
            onClick={onBack}
            className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
          >
            Exit
          </button>
        </>
      )}
    </div>
  );

  const renderPaymentForm = () => (
    <div className="space-y-6">
      {session && (
        <>
          <div>
            <button
              onClick={() => setStep('history')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Submit Payment</h2>
            <p className="text-gray-600">Flat {session.flat_number} • {session.apartment_name}</p>
          </div>

          <div className="space-y-4">
            {activeCollections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Type
                </label>
                <select
                  value={selectedCollectionId}
                  onChange={(e) => {
                    setSelectedCollectionId(e.target.value);
                    const selected = activeCollections.find(c => c.id === e.target.value);
                    if (selected?.amount_due) {
                      setPaymentAmount(selected.amount_due.toString());
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select collection</option>
                  {activeCollections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.collection_name}
                      {collection.amount_due && ` - ₹${collection.amount_due.toLocaleString()}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="whatsapp_opt_in_mobile"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-1 w-5 h-5 text-green-600 border-2 border-green-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                <label htmlFor="whatsapp_opt_in_mobile" className="flex-1 cursor-pointer">
                  <span className="text-sm font-semibold text-gray-900 block mb-1">
                    Send me payment updates on WhatsApp
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    You can change this anytime. WhatsApp messages are informational only.
                  </p>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Proof (Required)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                >
                  {screenshot ? screenshot.name : 'Click to upload screenshot'}
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or PDF (max 10MB)</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={() => setShowConfirmation(true)}
              disabled={submitting || !screenshot || !paymentAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Payment'
              )}
            </button>

            {/* Confirmation Dialog */}
            {showConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Confirm Payment Submission</h3>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">Please review your payment details:</p>
                    <div className="bg-gray-50 rounded p-3 space-y-1">
                      <p><span className="font-medium">Flat:</span> {session?.flat_number}</p>
                      <p><span className="font-medium">Building:</span> {session?.apartment_name}</p>
                      <p><span className="font-medium">Amount:</span> ₹{paymentAmount}</p>
                      <p><span className="font-medium">Date:</span> {new Date(paymentDate).toLocaleDateString()}</p>
                      {transactionRef && <p><span className="font-medium">Reference:</span> {transactionRef}</p>}
                    </div>
                    <p className="text-xs text-gray-500 pt-2">
                      Once submitted, you will receive a confirmation notification.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowConfirmation(false);
                        handleSubmitPayment();
                      }}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Confirm & Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Submitted!</h2>
        <p className="text-gray-600 mb-3">
          Your payment has been received and is under review.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
          <p className="text-sm text-green-800 mb-2 font-medium">
            Confirmation emails and WhatsApp messages have been sent.
          </p>
          <p className="text-xs text-green-700">
            You'll be notified once the committee approves your payment.
          </p>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <Info className="w-4 h-4 inline mr-1" />
          Typically reviewed within 24-48 hours
        </p>
      </div>
      <button
        onClick={onBack}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Done
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-8">
          {step === 'mobile' && renderMobileEntry()}
          {step === 'flat-selection' && renderFlatSelection()}
          {step === 'otp' && renderOtpVerification()}
          {step === 'history' && renderPaymentHistory()}
          {step === 'payment' && renderPaymentForm()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
