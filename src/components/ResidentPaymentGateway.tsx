import { useState } from 'react';
import { Smartphone, FileText, ArrowRight, Zap, Shield, Clock, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import MobilePaymentFlow from './MobilePaymentFlow';
import DynamicPaymentForm from './DynamicPaymentForm';

type EntryMode = 'selection' | 'mobile' | 'manual';

export default function ResidentPaymentGateway() {
  const [mode, setMode] = useState<EntryMode>('selection');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const renderSelection = () => (
    <section id="payment-form" className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl top-20 left-10 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl bottom-20 right-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-100">Fast & Secure Payment Submission</span>
          </div>
          <h2 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Submit Your Payment
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Choose how you'd like to submit your maintenance payment
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Mobile-First Option - RECOMMENDED */}
          <button
            onClick={() => setMode('mobile')}
            onMouseEnter={() => setHoveredCard('mobile')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-3xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-500 p-1 text-left overflow-hidden transform hover:scale-105 hover:-rotate-1"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

            {/* Inner card */}
            <div className="relative bg-white rounded-[22px] p-8 h-full">
              {/* Recommended Badge - More Prominent */}
              <div className="absolute -top-1 -right-1">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl rounded-tr-3xl shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  RECOMMENDED
                </div>
              </div>

              {/* Popularity indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                <span>Most Popular</span>
              </div>

              {/* Icon with animation */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 mt-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                <Smartphone className="w-10 h-10 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                Mobile Number Login
              </h3>
              <p className="text-blue-600 font-semibold text-sm mb-3">
                The fastest way to submit payments
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Secure OTP-based login with your registered mobile number. Auto-fill your details and submit in seconds.
              </p>

              {/* Features with checkmarks */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Lightning Fast - 30 Seconds</p>
                    <p className="text-sm text-gray-500">OTP verification + auto-filled forms</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Smart Auto-Fill</p>
                    <p className="text-sm text-gray-500">No repetitive data entry needed</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Complete Payment History</p>
                    <p className="text-sm text-gray-500">Track all your past submissions</p>
                  </div>
                </div>
              </div>

              {/* CTA with gradient */}
              <div className="flex items-center justify-between pt-6 border-t-2 border-blue-100">
                <span className="text-blue-600 font-bold text-lg group-hover:text-blue-700">
                  Get Started Now
                </span>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center group-hover:shadow-lg transition-all">
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>

          {/* Manual Entry Option */}
          <button
            onClick={() => setMode('manual')}
            onMouseEnter={() => setHoveredCard('manual')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 rounded-3xl shadow-2xl hover:shadow-slate-500/50 transition-all duration-500 p-1 text-left overflow-hidden transform hover:scale-105 hover:rotate-1"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

            {/* Inner card */}
            <div className="relative bg-white rounded-[22px] p-8 h-full">
              {/* Classic Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">
                <FileText className="w-3 h-3" />
                <span>Traditional</span>
              </div>

              {/* Icon with animation */}
              <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded-3xl flex items-center justify-center mb-6 mt-8 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                Manual Entry
              </h3>
              <p className="text-slate-600 font-semibold text-sm mb-3">
                No registration needed
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Traditional form-based submission. Perfect for first-time users or those who prefer complete control.
              </p>

              {/* Features with checkmarks */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">No Login Required</p>
                    <p className="text-sm text-gray-500">Start submitting immediately</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Full Control</p>
                    <p className="text-sm text-gray-500">Enter exactly what you need</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 group/item">
                  <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">One-Time Submissions</p>
                    <p className="text-sm text-gray-500">Ideal for guest payments</p>
                  </div>
                </div>
              </div>

              {/* CTA with gradient */}
              <div className="flex items-center justify-between pt-6 border-t-2 border-slate-100">
                <span className="text-slate-700 font-bold text-lg group-hover:text-slate-900">
                  Continue with Form
                </span>
                <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center group-hover:shadow-lg transition-all">
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Help Text and Trust Indicators */}
        <div className="mt-12 text-center space-y-6">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2 text-blue-200">
              <Shield className="w-4 h-4" />
              <span>Bank-Grade Security</span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <Zap className="w-4 h-4" />
              <span>Instant Processing</span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <Clock className="w-4 h-4" />
              <span>24/7 Available</span>
            </div>
          </div>

          <p className="text-sm text-blue-200">
            New to FlatFund Pro?{' '}
            <button className="text-white hover:text-blue-100 font-semibold underline underline-offset-4">
              Watch a quick tutorial
            </button>
            {' '}or{' '}
            <button className="text-white hover:text-blue-100 font-semibold underline underline-offset-4">
              Chat with us
            </button>
          </p>
        </div>
      </div>
    </section>
  );

  if (mode === 'mobile') {
    return <MobilePaymentFlow onBack={() => setMode('selection')} />;
  }

  if (mode === 'manual') {
    return (
      <div>
        <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setMode('selection')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
            >
              ← Back to options
            </button>
          </div>
        </div>
        <DynamicPaymentForm />
      </div>
    );
  }

  return renderSelection();
}
