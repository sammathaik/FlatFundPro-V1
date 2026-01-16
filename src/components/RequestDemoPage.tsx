import { useState } from 'react';
import { ArrowLeft, Mail, User, Building, Phone, Loader2, CheckCircle, AlertCircle, QrCode, Smartphone, Calendar, Shield, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCodeGenerator from './QRCodeGenerator';

interface RequestDemoPageProps {
  onBack: () => void;
}

export default function RequestDemoPage({ onBack }: RequestDemoPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    apartment_name: '',
    city: '',
    role: 'Committee Member'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('marketing_leads')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          apartment_name: formData.apartment_name,
          city: formData.city,
          message: `Demo Request - Role: ${formData.role}`,
          status: 'new'
        }]);

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting demo request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 sm:p-12">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-6">
                <img
                  src="/ffp-logo.jpg"
                  alt="FlatFund Pro Logo"
                  className="h-20 sm:h-24 w-auto rounded-xl shadow-lg bg-white p-2"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Request a Demo of FlatFund Pro
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 mb-6">
                See how we simplify apartment payment management for committees, treasurers, and society decision-makers
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Shield className="w-4 h-4" />
                  Secure & Private
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Zap className="w-4 h-4" />
                  Quick Setup
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Calendar className="w-4 h-4" />
                  24hr Response
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            {success ? (
              <div className="text-center py-16 max-w-2xl mx-auto">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Your demo request has been received. Our team will contact you within 24 hours to schedule your personalized demonstration.
                </p>
                <button
                  onClick={onBack}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Return to Home
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
                <div className="lg:col-span-2">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Fill in Your Details</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                          Your Name *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="John Doe"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="john@example.com"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="+91 98765 43210"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                          Your Role *
                        </label>
                        <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          disabled={loading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option>Committee Member</option>
                          <option>Society President</option>
                          <option>Treasurer</option>
                          <option>Secretary</option>
                          <option>Facility Manager</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="apartment" className="block text-sm font-medium text-gray-700 mb-2">
                          Apartment/Society Name *
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            id="apartment"
                            value={formData.apartment_name}
                            onChange={(e) => setFormData({ ...formData, apartment_name: e.target.value })}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Green Valley Apartments"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          disabled={loading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Bangalore"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        We'll contact you within 24 hours to schedule a personalized demo and answer your questions.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Request Demo
                          <Calendar className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div>
                  <div className="sticky top-8 space-y-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-3">
                          <QrCode className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Scan for Quick Access</h3>
                        <p className="text-sm text-gray-600">Share this QR code with your committee</p>
                      </div>

                      <div className="bg-white rounded-xl p-4 mb-4">
                        <QRCodeGenerator
                          url={typeof window !== 'undefined' ? window.location.href : 'https://flatfundpro.com/request-demo'}
                          size={200}
                          showDownload={true}
                          title="Request Demo"
                          subtitle="FlatFund Pro"
                        />
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                          <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">On Mobile?</p>
                            <p className="text-gray-600 text-xs">Fill the form directly</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                          <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-gray-900">Print & Share</p>
                            <p className="text-gray-600 text-xs">Perfect for meetings & notice boards</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-3">What to Expect</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>30-minute personalized walkthrough</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Custom setup recommendations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Q&A session with our experts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>No obligation or pressure</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
