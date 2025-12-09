import { ArrowRight, Building2, CheckCircle, DollarSign, FileText, Shield, Users, BarChart3, Clock, TrendingUp, Mail, Phone, Sparkles, Zap, Target } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface MarketingLandingPageProps {
  navigate?: (path: string) => void;
}

export default function MarketingLandingPage({ navigate }: MarketingLandingPageProps = {}) {
  const handleNavigate = (path: string) => {
    if (navigate) {
      navigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    apartment_name: '',
    city: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('marketing_leads')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            apartment_name: formData.apartment_name,
            city: formData.city,
            message: formData.message || null,
            status: 'new'
          }
        ]);

      if (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your request. Please try again.');
      } else {
        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', apartment_name: '', city: '', message: '' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="/FlatFundPro-2-Logo.jpeg" alt="FlatFund Pro" className="h-12 sm:h-14 object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FlatFund Pro</h1>
                <p className="text-xs text-amber-600">Smart Payment Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigate('/admin')}
                className="hidden sm:inline-flex items-center gap-2 text-gray-600 hover:text-amber-600 transition-colors text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigate('/admin')}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors font-medium text-sm"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-amber-50 via-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Trusted by 100+ Apartment Societies
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Simplify Your Apartment Payment Management
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                FlatFund Pro streamlines maintenance payment tracking, reporting, and management for apartment societies. Say goodbye to spreadsheets and manual follow-ups.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  Request Demo
                  <ArrowRight className="w-5 h-5" />
                </a>
                <button
                  onClick={() => handleNavigate('/admin')}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg transition-colors font-semibold text-lg border-2 border-gray-200"
                >
                  Try It Now
                </button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  No Credit Card Required
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Setup in Minutes
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Payment Overview</h3>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Live</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Collected</p>
                      <p className="text-2xl font-bold text-amber-600">₹8.5L</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-blue-600">₹1.2L</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[92, 78, 85].map((percent, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl border-2 border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Collection Rate</p>
                    <p className="text-lg font-bold text-gray-900">95.8%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Are You Still Managing Payments the Old Way?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Traditional payment tracking methods are time-consuming, error-prone, and frustrating for everyone involved.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Spreadsheet Chaos',
                description: 'Hours spent updating Excel sheets, prone to errors and version conflicts'
              },
              {
                icon: Clock,
                title: 'Manual Follow-ups',
                description: 'Endless phone calls and messages to track down pending payments'
              },
              {
                icon: BarChart3,
                title: 'No Visibility',
                description: 'Difficulty generating reports and tracking payment trends over time'
              }
            ].map((problem, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-sm border-2 border-red-100">
                <div className="bg-red-50 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <problem.icon className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{problem.title}</h3>
                <p className="text-gray-600">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution/Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              Complete Solution
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Payments
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              FlatFund Pro provides a comprehensive platform designed specifically for apartment societies
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: 'Payment Tracking',
                description: 'Track all maintenance payments in real-time with automatic status updates and quarter-wise organization',
                color: 'amber'
              },
              {
                icon: Building2,
                title: 'Building Management',
                description: 'Manage multiple buildings, blocks, and flats with a structured hierarchy that scales',
                color: 'blue'
              },
              {
                icon: Users,
                title: 'Multi-level Access',
                description: 'Super Admin, Apartment Admin, and Resident portals with role-based permissions',
                color: 'green'
              },
              {
                icon: BarChart3,
                title: 'Smart Reports',
                description: 'Generate detailed payment reports, collection summaries, and analytics at the click of a button',
                color: 'purple'
              },
              {
                icon: Shield,
                title: 'Secure & Private',
                description: 'Bank-grade security with encrypted data storage and role-based access control',
                color: 'red'
              },
              {
                icon: Zap,
                title: 'Quick Setup',
                description: 'Get started in minutes with intuitive onboarding and bulk import capabilities',
                color: 'orange'
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white p-8 rounded-xl shadow-sm border-2 border-gray-100 hover:border-amber-300 hover:shadow-lg transition-all">
                <div className={`bg-${feature.color}-50 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How FlatFund Pro Works
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Get up and running in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {[
              {
                step: '01',
                title: 'Setup Your Society',
                description: 'Add your apartment details, buildings, and flat information. Import from existing data or create from scratch.'
              },
              {
                step: '02',
                title: 'Invite Residents',
                description: 'Share the payment portal link with residents. They can submit payments with proof instantly.'
              },
              {
                step: '03',
                title: 'Track & Report',
                description: 'Monitor all payments in real-time, approve submissions, and generate comprehensive reports.'
              }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white p-8 rounded-xl shadow-lg">
                  <div className="text-5xl font-bold text-amber-200 mb-4">{step.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-amber-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Transform Your Apartment Management
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join hundreds of apartment societies that have already simplified their payment management with FlatFund Pro.
              </p>
              <div className="space-y-4">
                {[
                  'Save 10+ hours every month on payment tracking',
                  'Reduce payment delays by up to 60%',
                  'Eliminate manual errors and data entry',
                  'Improve transparency for all residents',
                  'Generate reports in seconds, not days',
                  'Access from anywhere, anytime'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <p className="text-gray-700 text-lg">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-8 rounded-2xl">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Stats</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Collection Efficiency</span>
                      <span className="text-2xl font-bold text-amber-600">+40%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Time Saved</span>
                      <span className="text-2xl font-bold text-blue-600">80%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Error Reduction</span>
                      <span className="text-2xl font-bold text-green-600">95%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Simplify Your Payment Management?
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Start your free trial today. No credit card required. Setup takes less than 10 minutes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => handleNavigate('/admin')}
              className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-900 px-8 py-4 rounded-lg transition-colors font-semibold text-lg"
            >
              Schedule Demo
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              No setup fees
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              24/7 support
            </div>
          </div>
        </div>
      </section>

      {/* Contact/Demo Form */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Request a Demo
            </h2>
            <p className="text-lg text-gray-600">
              See FlatFund Pro in action. Fill out the form below and we'll get back to you within 24 hours.
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 sm:p-12">
            {submitted ? (
              <div className="text-center py-12">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h3>
                <p className="text-gray-600 text-lg">
                  We've received your request. Our team will contact you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Apartment Name *
                    </label>
                    <input
                      type="text"
                      value={formData.apartment_name}
                      onChange={(e) => setFormData({ ...formData, apartment_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Green Meadows"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Mumbai, Bangalore, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Tell us about your apartment society..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Request Demo'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/FlatFundPro-2-Logo.jpeg" alt="FlatFund Pro" className="h-10 object-contain" />
                <div>
                  <h3 className="text-xl font-bold">FlatFund Pro</h3>
                  <p className="text-xs text-gray-400">Smart Payment Management</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                Simplifying apartment payment management for societies across the country.
              </p>
              <div className="flex gap-4">
                <a href="mailto:contact@flatfundpro.com" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">contact@flatfundpro.com</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Login</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Request Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 FlatFund Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
