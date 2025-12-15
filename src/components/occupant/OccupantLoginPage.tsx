import { useState } from 'react';
import { Home, Mail, Phone, KeyRound, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OccupantLoginPageProps {
  onLoginSuccess: (occupant: any) => void;
  onBack?: () => void;
}

export default function OccupantLoginPage({ onLoginSuccess, onBack }: OccupantLoginPageProps) {
  const [step, setStep] = useState<'email' | 'mobile' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentOtp, setSentOtp] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('generate_occupant_otp', {
        p_email: email.toLowerCase().trim(),
      });

      if (error) throw error;

      if (!data.success) {
        if (data.needs_mobile) {
          setStep('mobile');
        } else {
          setError(data.message || 'Failed to send OTP');
        }
      } else {
        setSentOtp(data.otp);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('generate_occupant_otp', {
        p_email: email.toLowerCase().trim(),
        p_mobile: mobile,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Failed to send OTP');
      } else {
        setSentOtp(data.otp);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
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
        p_email: email.toLowerCase().trim(),
        p_otp: otp,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Invalid OTP');
      } else {
        const emailLower = email.toLowerCase().trim();
        const tempPassword = `otp_verified_${data.user_id}`;

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: emailLower,
          password: tempPassword,
        });

        if (authError) {
          console.error('Auth sign-in error:', authError);
        }

        onLoginSuccess(data.occupant);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('generate_occupant_otp', {
        p_email: email.toLowerCase().trim(),
        p_mobile: mobile || undefined,
      });

      if (error) throw error;

      if (!data.success) {
        setError(data.message || 'Failed to resend OTP');
      } else {
        setSentOtp(data.otp);
        setError('');
        alert('OTP resent successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 rounded-full">
              <Home className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Occupant Portal
          </h2>
          <p className="text-center text-gray-600 mb-8">
            View your payment history and transactions
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

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
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'mobile' && (
            <form onSubmit={handleMobileSubmit} className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm">
                  Please provide your mobile number to receive an OTP for secure login.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  An OTP will be sent to this number
                </p>
              </div>

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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                <p className="text-sm">
                  An OTP has been sent to your mobile number. Please enter it below to continue.
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center text-2xl tracking-widest"
                  />
                </div>
              </div>

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
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-lg font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setSentOtp('');
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium transition-all"
              >
                Change Email
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
