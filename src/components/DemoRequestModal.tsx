import { useState } from 'react';
import { X, Mail, User, Building, Phone, Loader2, CheckCircle, AlertCircle, QrCode, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCodeGenerator from './QRCodeGenerator';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFullPage?: () => void;
}

export default function DemoRequestModal({ isOpen, onClose, onNavigateToFullPage }: DemoRequestModalProps) {
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

  if (!isOpen) return null;

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
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          apartment_name: '',
          city: '',
          role: 'Committee Member'
        });
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting demo request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <img
              src="/flatfundpro-logo.svg"
              alt="FlatFund Pro Logo"
              className="h-12 sm:h-14 w-auto rounded-lg shadow-md bg-white p-1.5 flex-shrink-0"
            />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Request a Demo of FlatFund Pro</h2>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                For Committees, Society Decision-Makers & Management Teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-6">
            <div className="lg:col-span-2 order-2 lg:order-1">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h3>
                  <p className="text-gray-600">
                    We'll contact you shortly to schedule your personalized demo.
                  </p>
                </div>
              ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="demo-name"
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
                  <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="demo-email"
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      id="demo-phone"
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
                  <label htmlFor="demo-role" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Role
                  </label>
                  <select
                    id="demo-role"
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="demo-apartment" className="block text-sm font-medium text-gray-700 mb-2">
                    Apartment/Society Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="demo-apartment"
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
                  <label htmlFor="demo-city" className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="demo-city"
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
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request Demo'
                )}
              </button>
                </form>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 sticky top-24">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-3">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Quick Demo Access</h3>
                  <p className="text-sm text-gray-600">Scan to request a demo instantly</p>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4">
                  <QRCodeGenerator
                    url={typeof window !== 'undefined' ? window.location.href : 'https://flatfundpro.com'}
                    size={180}
                    showDownload={false}
                  />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                    <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">On Mobile?</p>
                      <p className="text-gray-600 text-xs">Just fill the form to the left</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                    <QrCode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Share this QR</p>
                      <p className="text-gray-600 text-xs">Perfect for committee meetings</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                  <p className="text-xs text-gray-600 text-center">
                    We'll respond within 24 hours to schedule your personalized demo
                  </p>
                  {onNavigateToFullPage && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToFullPage();
                      }}
                      className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium text-center py-2 hover:bg-blue-50 rounded transition-colors"
                    >
                      View Full Demo Page
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
