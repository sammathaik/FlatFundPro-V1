import { useState, useRef, useEffect } from 'react';
import { X, Mail, Smartphone, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import MobileNumberInput from './MobileNumberInput';
import { normalizeMobileNumber } from '../lib/mobileNumberUtils';

interface UniversalLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (roles: string[]) => void;
}

type LoginMethod = 'email' | 'mobile';
type MobileStep = 'discover' | 'flat-selection' | 'otp' | 'success';

interface FlatInfo {
  flat_id: string;
  apartment_id: string;
  apartment_name: string;
  flat_number: string;
  occupant_type: 'Owner' | 'Tenant';
  mobile: string;
}

export default function UniversalLoginModal({ isOpen, onClose, onLoginSuccess }: UniversalLoginModalProps) {
  const { signIn } = useAuth();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [mobileStep, setMobileStep] = useState<MobileStep>('discover');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [discoveredFlats, setDiscoveredFlats] = useState<FlatInfo[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<FlatInfo | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mobileStep === 'otp' && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300);
    }
  }, [mobileStep]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      onLoginSuccess?.(['admin']);
    }
  };

  const handleDiscoverFlats = async () => {
    const normalized = normalizeMobileNumber(mobileNumber);

    if (!normalized.localNumber || normalized.localNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data, rpcError;

      const result1 = await supabase.rpc('discover_flats_by_mobile', {
        mobile_number: mobileNumber
      });

      if (result1.error || (result1.data as any)?.count === 0) {
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

      if (!result.success || result.count === 0) {
        setError('No account found with this mobile number');
        return;
      }

      setDiscoveredFlats(result.flats);

      if (result.count === 1) {
        setSelectedFlat(result.flats[0]);
        const success = await generateOtp(result.flats[0]);
        if (success) {
          setMobileStep('otp');
        }
      } else {
        setMobileStep('flat-selection');
      }
    } catch (err) {
      console.error('Error discovering flats:', err);
      setError('Failed to find account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateOtp = async (flat: FlatInfo): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedOtp('');

    try {
      const normalized = normalizeMobileNumber(mobileNumber);
      const mobileToUse = flat.mobile || normalized.localNumber;

      const { data, error: rpcError } = await supabase.rpc('generate_mobile_otp', {
        mobile_number: mobileToUse,
        p_flat_id: flat.flat_id
      });

      if (rpcError) throw rpcError;
      if (!data) throw new Error('No data returned');

      const result = data as { success: boolean; otp?: string; message: string; error?: string };

      if (!result.success) {
        setError(result.message || result.error || 'Failed to generate OTP');
        return false;
      }

      if (result.otp) {
        setGeneratedOtp(result.otp);
      }

      setSuccessMessage('OTP sent successfully!');
      return true;
    } catch (err: any) {
      console.error('Error generating OTP:', err);
      setError(err.message || 'Failed to generate OTP');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFlat = async (flat: FlatInfo) => {
    setSelectedFlat(flat);
    setError(null);
    setSuccessMessage(null);

    const success = await generateOtp(flat);
    if (success) {
      setMobileStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalized = normalizeMobileNumber(mobileNumber);
      const mobileToUse = selectedFlat?.mobile || normalized.localNumber;

      const { data, error: rpcError } = await supabase.rpc('verify_mobile_otp_for_payment', {
        mobile_number: mobileToUse,
        otp_code: otpCode
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; message: string };

      if (!result.success) {
        setError(result.message);
        return;
      }

      onLoginSuccess?.(['resident']);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailLogin = () => (
    <form onSubmit={handleEmailLogin} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="admin@example.com"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your password"
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  );

  const renderMobileDiscover = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-gray-600">Enter your registered mobile number</p>
      </div>

      <MobileNumberInput
        value={mobileNumber}
        onChange={(value) => {
          setMobileNumber(value);
          setError(null);
        }}
        onSubmit={handleDiscoverFlats}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
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
    </div>
  );

  const renderFlatSelection = () => (
    <div className="space-y-4">
      <button
        onClick={() => setMobileStep('discover')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <p className="text-gray-600 mb-4">Select your flat to continue</p>
      <div className="space-y-2">
        {discoveredFlats.map((flat) => (
          <button
            key={flat.flat_id}
            onClick={() => handleSelectFlat(flat)}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
          >
            <div className="font-semibold text-gray-800">{flat.flat_number}</div>
            <div className="text-sm text-gray-600">{flat.apartment_name}</div>
            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mt-1">
              {flat.occupant_type}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderOtpVerification = () => (
    <div className="space-y-4">
      <button
        onClick={() => setMobileStep(discoveredFlats.length > 1 ? 'flat-selection' : 'discover')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <p className="text-gray-600 mb-4">
        We've sent a 6-digit code to {mobileNumber}
      </p>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {generatedOtp && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-blue-800 font-semibold text-center">
            Development OTP: <span className="text-xl font-bold">{generatedOtp}</span>
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-semibold focus:ring-2 focus:ring-blue-500"
      />

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
          'Verify & Login'
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
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Login to FlatFund Pro</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {mobileStep === 'discover' && (
            <>
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMethod === 'email'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </button>
                <button
                  onClick={() => setLoginMethod('mobile')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loginMethod === 'mobile'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4 inline mr-2" />
                  Mobile
                </button>
              </div>

              {loginMethod === 'email' ? renderEmailLogin() : renderMobileDiscover()}
            </>
          )}

          {loginMethod === 'mobile' && mobileStep === 'flat-selection' && renderFlatSelection()}
          {loginMethod === 'mobile' && mobileStep === 'otp' && renderOtpVerification()}
        </div>
      </div>
    </div>
  );
}
