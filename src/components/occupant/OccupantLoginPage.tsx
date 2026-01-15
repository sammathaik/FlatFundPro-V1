import { useState, useEffect } from 'react';
import { Home, Mail, Phone, KeyRound, ArrowLeft, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MobileNumberInput from '../MobileNumberInput';
import { normalizeMobileNumber } from '../../lib/mobileNumberUtils';

interface OccupantLoginPageProps {
  onLoginSuccess: (occupant: any) => void;
  onBack?: () => void;
}

export default function OccupantLoginPage({ onLoginSuccess, onBack }: OccupantLoginPageProps) {
  // Check entry context to determine initial flow
  const entryContext = sessionStorage.getItem('occupant_entry_context');
  const initialStep = (entryContext === 'payment_submission' || entryContext === 'mobile_login') ? 'mobile' : 'email';

  const [step, setStep] = useState<'email' | 'mobile' | 'otp' | 'flat-selection'>(initialStep);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [availableFlats, setAvailableFlats] = useState<any[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('mobile');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setLoginMethod('email');

    try {
      // NEW: Get flats by email BEFORE sending OTP
      const { data: flatsData, error: flatsError } = await supabase.rpc('get_flats_by_email', {
        p_email: email.toLowerCase().trim(),
      });

      if (flatsError) throw flatsError;

      if (!flatsData || flatsData.length === 0) {
        setError('No account found with this email address');
        setLoading(false);
        return;
      }

      // If multiple flats, show selection screen
      if (flatsData.length > 1) {
        setAvailableFlats(flatsData);
        setStep('flat-selection');
        setLoading(false);
      } else {
        // Single flat - use its mobile and proceed
        const singleFlat = flatsData[0];
        setSelectedFlatId(singleFlat.flat_id);
        setMobile(singleFlat.occupant_mobile);

        // Generate OTP for single flat
        await generateOtpForFlat(singleFlat.flat_id, singleFlat.occupant_mobile);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleMobileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    setLoginMethod('mobile');

    const normalized = normalizeMobileNumber(mobile);

    if (!normalized.localNumber || normalized.localNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      setLoading(false);
      return;
    }

    try {
      // Get flats by mobile BEFORE sending OTP
      const { data: flatsData, error: flatsError } = await supabase.rpc('get_flats_by_mobile', {
        p_mobile: normalized.fullNumber,
      });

      if (flatsError) throw flatsError;

      if (!flatsData || flatsData.length === 0) {
        setError('No account found with this mobile number');
        setLoading(false);
        return;
      }

      // Store mobile
      setMobile(normalized.fullNumber);

      // If multiple flats, show selection screen
      if (flatsData.length > 1) {
        setAvailableFlats(flatsData);
        setStep('flat-selection');
        setLoading(false);
      } else {
        // Single flat - proceed
        const singleFlat = flatsData[0];
        setSelectedFlatId(singleFlat.flat_id);
        if (singleFlat.occupant_email) {
          setEmail(singleFlat.occupant_email);
        }

        // Generate OTP for single flat
        await generateOtpForFlat(singleFlat.flat_id, normalized.fullNumber);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const generateOtpForFlat = async (flatId: string, mobileNum?: string) => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.rpc('generate_occupant_otp', {
        p_email: email ? email.toLowerCase().trim() : null,
        p_mobile: mobileNum || mobile,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Failed to send OTP');
      } else {
        setSentOtp(data.otp);
        // Store mobile if returned
        if (data.mobile && !mobile) {
          setMobile(data.mobile);
        }
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('verify_occupant_otp', {
        p_email: email ? email.toLowerCase().trim() : null,
        p_otp: otp,
        p_flat_id: selectedFlatId || null,
        p_mobile: mobile || null,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Invalid OTP');
      } else {
        // Store last selected flat
        await supabase.rpc('set_last_selected_flat', {
          p_mobile: loginMethod === 'mobile' ? mobile : null,
          p_email: loginMethod === 'email' ? email.toLowerCase().trim() : null,
          p_flat_id: selectedFlatId,
          p_apartment_id: availableFlats.find(f => f.flat_id === selectedFlatId)?.apartment_id || null,
        });

        // Get ALL flats for this occupant (for context switching later)
        let allFlats = [];
        if (loginMethod === 'mobile') {
          const { data: flatsData } = await supabase.rpc('get_flats_by_mobile', {
            p_mobile: mobile,
          });
          allFlats = flatsData || [];
        } else {
          const { data: flatsData } = await supabase.rpc('get_flats_by_email', {
            p_email: email.toLowerCase().trim(),
          });
          allFlats = flatsData || [];
        }

        // If user logged in via mobile, ensure context is set for pending payments view
        if (initialStep === 'mobile') {
          sessionStorage.setItem('occupant_entry_context', 'mobile_login');
        }

        // Pass occupant data with session token and all flats
        onLoginSuccess({
          ...data.occupant,
          sessionToken: data.session_token,
          selectedFlatId: selectedFlatId,
          allFlats: allFlats,
          loginMethod: loginMethod,
          loginMobile: loginMethod === 'mobile' ? mobile : null,
          loginEmail: loginMethod === 'email' ? email.toLowerCase().trim() : null,
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFlatSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedFlatId) {
      setError('Please select a flat');
      return;
    }

    // Find the selected flat to get its details
    const selectedFlat = availableFlats.find(f => f.flat_id === selectedFlatId);
    if (!selectedFlat) {
      setError('Invalid flat selection');
      return;
    }

    // For email login, use the mobile from the selected flat
    if (loginMethod === 'email') {
      setMobile(selectedFlat.occupant_mobile);
      await generateOtpForFlat(selectedFlatId, selectedFlat.occupant_mobile);
    } else {
      // For mobile login, store email if available
      if (selectedFlat.occupant_email) {
        setEmail(selectedFlat.occupant_email);
      }
      await generateOtpForFlat(selectedFlatId);
    }
  };

  const maskMobileNumber = (mobileNum: string): string => {
    if (!mobileNum || mobileNum.length < 4) return '****';
    const lastFour = mobileNum.slice(-4);
    const masked = '*'.repeat(mobileNum.length - 4) + lastFour;
    return masked;
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('generate_occupant_otp', {
        p_email: email ? email.toLowerCase().trim() : null,
        p_mobile: mobile || undefined,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Failed to resend OTP');
      } else {
        setSentOtp(data.otp);
        setError('');
        setSuccessMessage('OTP resent successfully!');
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(initialStep);
    setEmail('');
    setMobile('');
    setOtp('');
    setSentOtp('');
    setAvailableFlats([]);
    setSelectedFlatId('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 rounded-full">
              <Home className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Occupant Portal
          </h2>
          <p className="text-center text-gray-600 mb-8">
            {entryContext === 'payment_submission'
              ? 'Submit payments and manage your account'
              : 'View your payment history and transactions'}
          </p>

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>

              <button
                type="button"
                onClick={() => setStep('mobile')}
                className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm font-medium"
              >
                Login with Mobile Number Instead
              </button>
            </form>
          )}

          {step === 'mobile' && (
            <form onSubmit={handleMobileSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  Enter your registered mobile number for quick login
                </p>
              </div>

              <div>
                <MobileNumberInput
                  value={mobile}
                  onChange={(value) => setMobile(value)}
                  label="Mobile Number"
                  placeholder="Enter 10-digit mobile number"
                  required
                  onSubmit={handleMobileSubmit}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll show your registered flats next
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || normalizeMobileNumber(mobile).localNumber.length !== 10}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue'}
                </button>
                {initialStep !== 'mobile' && (
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="w-full text-blue-600 hover:text-blue-700 py-2 text-sm font-medium"
                  >
                    Login with Email Instead
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'flat-selection' && (
            <form onSubmit={handleFlatSelection} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm font-semibold mb-1">Multiple Flats Found</p>
                <p className="text-xs">
                  You are registered in {availableFlats.length} flats. Select which flat you want to access.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Your Flat
                </label>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {availableFlats.map((flat) => (
                    <label
                      key={flat.flat_id}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedFlatId === flat.flat_id
                          ? 'border-blue-600 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="flat"
                        value={flat.flat_id}
                        checked={selectedFlatId === flat.flat_id}
                        onChange={(e) => setSelectedFlatId(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-bold text-gray-900">
                          Flat {flat.flat_number}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {flat.apartment_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {flat.block_name}
                        </p>
                        {(flat.occupant_name || flat.name) && (
                          <p className="text-sm text-blue-700 font-medium mt-2">
                            {flat.occupant_name || flat.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          {flat.occupant_type}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedFlatId}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send OTP & Continue'}
              </button>

              <button
                type="button"
                onClick={resetFlow}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-all"
              >
                Start Over
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm">
                  An OTP has been sent to {mobile ? maskMobileNumber(mobile) : 'your mobile number'}. Please enter it below to continue.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  />
                </div>
              </div>

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {sentOtp && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
                  <p className="font-medium">Development Mode: Your OTP is {sentOtp}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="button"
                onClick={resetFlow}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-all"
              >
                Start Over
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6 text-sm text-gray-600">
          <p>Need help? Contact your apartment administrator</p>
        </div>
      </div>
    </div>
  );
}
