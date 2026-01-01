import { useState } from 'react';
import { Smartphone, FileText, ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import MobilePaymentFlow from './MobilePaymentFlow';
import DynamicPaymentForm from './DynamicPaymentForm';

type EntryMode = 'selection' | 'mobile' | 'manual';

export default function ResidentPaymentGateway() {
  const [mode, setMode] = useState<EntryMode>('selection');

  const renderSelection = () => (
    <section id="payment-form" className="py-16 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Submit Your Payment
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your preferred method to submit maintenance payments quickly and securely
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Mobile-First Option */}
          <button
            onClick={() => setMode('mobile')}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-blue-500 overflow-hidden"
          >
            {/* Recommended Badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMMENDED
            </div>

            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Smartphone className="w-8 h-8 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Mobile Number Login
            </h3>
            <p className="text-gray-600 mb-6">
              Fast, secure login with your registered mobile number. Perfect for recurring payments.
            </p>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Lightning Fast</p>
                  <p className="text-sm text-gray-500">Submit in under 30 seconds</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Auto-Filled Forms</p>
                  <p className="text-sm text-gray-500">No repetitive data entry</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-800">Payment History</p>
                  <p className="text-sm text-gray-500">View all past submissions</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-blue-600 font-semibold group-hover:text-blue-700">
                Get Started
              </span>
              <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Manual Entry Option */}
          <button
            onClick={() => setMode('manual')}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-left border-2 border-transparent hover:border-gray-300"
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8 text-gray-700" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Manual Entry
            </h3>
            <p className="text-gray-600 mb-6">
              Traditional form-based submission. Use this if you're a first-time user or prefer manual entry.
            </p>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>
                <p className="text-gray-600">No login required</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>
                <p className="text-gray-600">Fill all details manually</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>
                <p className="text-gray-600">Good for one-time submissions</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-gray-700 font-semibold group-hover:text-gray-900">
                Continue with Form
              </span>
              <ArrowRight className="w-5 h-5 text-gray-700 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            New to FlatFund Pro?{' '}
            <button className="text-blue-600 hover:text-blue-700 font-medium underline">
              Watch a quick tutorial
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
