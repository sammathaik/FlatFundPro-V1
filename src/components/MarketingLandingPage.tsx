import { ArrowRight, Building2, CheckCircle, Coins, FileText, Shield, Users, BarChart3, Clock, TrendingUp, Mail, Phone, Sparkles, Zap, Target, Smartphone, Eye, Award, Heart, MousePointer, Download, MessageCircle, Calendar, Bell, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import QRCodeGenerator from './QRCodeGenerator';

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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#demo') {
      setTimeout(() => {
        const demoSection = document.getElementById('demo');
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

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
              <img src="/flatfundpro-2-logo.jpeg" alt="FlatFund Pro" className="h-16 sm:h-18 object-contain drop-shadow-md" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FlatFund Pro</h1>
                <p className="text-xs text-amber-600 font-medium">Smart Society Management</p>
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
              <div className="hidden lg:flex items-center gap-3 mt-8 p-4 bg-white rounded-xl border-2 border-amber-200 shadow-md">
                <QrCode className="w-10 h-10 text-amber-600" />
                <div>
                  <p className="font-semibold text-gray-900">Scan for Quick Demo</p>
                  <p className="text-sm text-gray-600">Jump to request form</p>
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
                icon: Coins,
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

      {/* Ease of Use Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <MousePointer className="w-4 h-4" />
              Incredibly Simple
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              So Easy, Anyone Can Use It
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              No technical skills required. No training needed. If you can use WhatsApp, you can use FlatFund Pro.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: MousePointer,
                title: 'One-Click Actions',
                description: 'Approve payments, send reminders, or generate reports with just one click',
                color: 'blue'
              },
              {
                icon: Smartphone,
                title: 'Mobile Friendly',
                description: 'Works perfectly on your phone, tablet, or computer. Manage on the go!',
                color: 'green'
              },
              {
                icon: Eye,
                title: 'Clear Dashboard',
                description: 'See everything at a glance. No confusing menus or hidden features',
                color: 'purple'
              },
              {
                icon: Zap,
                title: '5-Minute Setup',
                description: 'Import your data from Excel or add manually. Start in minutes, not days',
                color: 'amber'
              }
            ].map((item, index) => (
              <div key={index} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all">
                <div className={`bg-${item.color}-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 lg:p-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Everything is Visual and Intuitive</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  step: 'Dashboard',
                  description: 'Color-coded cards show you payment status instantly. Green means paid, Yellow means pending, Red means overdue.',
                  icon: BarChart3
                },
                {
                  step: 'Payment Tracking',
                  description: 'Click on any flat to see full payment history. Filter by building, date, or status in one click.',
                  icon: Coins
                },
                {
                  step: 'Reports',
                  description: 'Choose date range, click "Generate Report" and download Excel or PDF. That\'s it!',
                  icon: FileText
                }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{item.step}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Real-World Use Cases */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              See How Societies Like Yours Benefit
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Real stories from real apartment admins who made the switch
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                society: 'Green Valley Apartments',
                location: 'Mumbai',
                flats: 120,
                icon: Building2,
                problem: 'Spent 15+ hours monthly chasing payments via phone calls',
                solution: 'Now residents submit payments online. Auto-reminders handle follow-ups.',
                result: 'Saves 12 hours/month. Collection rate improved from 70% to 92%',
                admin: 'Priya S., Secretary'
              },
              {
                society: 'Sunshine Residency',
                location: 'Bangalore',
                flats: 85,
                icon: Building2,
                problem: 'Excel sheets got corrupted. Lost 6 months of payment records',
                solution: 'All data now secure in cloud. Can access from anywhere.',
                result: 'Zero data loss. Full payment history always available',
                admin: 'Rajesh K., Treasurer'
              },
              {
                society: 'Palm Greens',
                location: 'Pune',
                flats: 200,
                icon: Building2,
                problem: 'Residents constantly questioned payment status transparency',
                solution: 'Public payment status page lets everyone see who paid, who didn\'t',
                result: 'No more disputes. Complete transparency builds trust',
                admin: 'Amit P., Admin'
              }
            ].map((useCase, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <useCase.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm">{useCase.flats} Flats</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{useCase.society}</h3>
                  <p className="text-white/80 text-sm">{useCase.location}</p>
                </div>
                <div className="p-6">
                  <div className="mb-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-red-100 px-2 py-1 rounded text-xs font-semibold text-red-700">Before</div>
                    </div>
                    <p className="text-sm text-gray-700">{useCase.problem}</p>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-blue-100 px-2 py-1 rounded text-xs font-semibold text-blue-700">Solution</div>
                    </div>
                    <p className="text-sm text-gray-700">{useCase.solution}</p>
                  </div>
                  <div className="mb-4 bg-green-50 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <div className="bg-green-100 px-2 py-1 rounded text-xs font-semibold text-green-700">Result</div>
                    </div>
                    <p className="text-sm font-semibold text-green-900">{useCase.result}</p>
                  </div>
                  <p className="text-xs text-gray-500 italic">- {useCase.admin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Heart className="w-4 h-4" />
              Loved by Admins
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              What Apartment Admins Say
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Don't just take our word for it. Here's what your fellow admins love about FlatFund Pro
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I was skeptical about moving from Excel, but FlatFund Pro is so much easier! Now I don't dread the end of the month.",
                name: "Sneha M.",
                role: "Building Secretary",
                society: "Lake View Towers, Hyderabad",
                rating: 5
              },
              {
                quote: "Best part? Residents can see the payment status themselves. No more 'Did you receive my payment?' calls at 9 PM!",
                name: "Vikram S.",
                role: "Apartment Admin",
                society: "Royal Apartments, Delhi",
                rating: 5
              },
              {
                quote: "Setup was surprisingly quick. Imported our data in 10 minutes and we were live. The support team is fantastic too!",
                name: "Meera R.",
                role: "Treasurer",
                society: "Sunrise Society, Chennai",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Award key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-4 italic">"{testimonial.quote}"</blockquote>
                <div className="border-t border-amber-200 pt-4">
                  <p className="font-bold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-gray-500 mt-1">{testimonial.society}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Transform Your Apartment Management Today
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Join hundreds of apartment societies that have already simplified their payment management with FlatFund Pro.
              </p>
              <div className="space-y-4">
                {[
                  { text: 'Save 10+ hours every month on payment tracking', icon: Clock },
                  { text: 'Reduce payment delays by up to 60%', icon: TrendingUp },
                  { text: 'Eliminate manual errors and data entry', icon: CheckCircle },
                  { text: 'Improve transparency for all residents', icon: Eye },
                  { text: 'Generate reports in seconds, not days', icon: FileText },
                  { text: 'Access from anywhere, anytime', icon: Smartphone }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <benefit.icon className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                    <p className="text-gray-200 text-lg">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-8 rounded-2xl border border-amber-500/30">
              <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold text-white mb-6">Proven Results</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Collection Efficiency</span>
                      <span className="text-2xl font-bold text-amber-400">+40%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Time Saved</span>
                      <span className="text-2xl font-bold text-blue-400">80%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Error Reduction</span>
                      <span className="text-2xl font-bold text-green-400">95%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">Admin Satisfaction</span>
                      <span className="text-2xl font-bold text-purple-400">98%</span>
                    </div>
                    <div className="bg-gray-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about getting started
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                question: 'How long does it take to set up FlatFund Pro?',
                answer: 'Most societies are up and running in under 10 minutes. Simply add your buildings and flats, and you\'re ready to go. You can import data from Excel or add manually. Our intuitive interface guides you through every step.'
              },
              {
                question: 'Do residents need to create accounts?',
                answer: 'No! Residents simply visit your payment portal (which we provide), select their flat, and submit payment details with proof. No registration or login required for residents. It\'s that simple!'
              },
              {
                question: 'Can I see payment status without logging in?',
                answer: 'Yes! FlatFund Pro provides a public payment status page where anyone can see which flats have paid and which haven\'t (without showing personal details or amounts). This creates complete transparency.'
              },
              {
                question: 'What if I need help or have questions?',
                answer: 'We offer 24/7 support via email and chat. Our team responds within hours, not days. Plus, our platform is so intuitive that most admins never need to contact support!'
              },
              {
                question: 'Can I export data to Excel?',
                answer: 'Absolutely! Generate reports and download them as Excel or PDF files anytime. Your data is always yours to export, analyze, or archive.'
              },
              {
                question: 'Is my data secure?',
                answer: 'Yes! We use bank-grade encryption and secure cloud storage. Your data is backed up automatically and protected with role-based access control. Only authorized admins can access sensitive information.'
              },
              {
                question: 'Can I manage multiple buildings?',
                answer: 'Yes! FlatFund Pro supports multiple buildings, blocks, and even multiple apartment complexes under one account. Perfect for large societies.'
              },
              {
                question: 'What happens after the free trial?',
                answer: 'You can continue with our affordable subscription plans. Pricing is transparent and based on the number of flats. No hidden costs, cancel anytime.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-6 hover:border-amber-200 transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                  <MessageCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-1" />
                  {faq.question}
                </h3>
                <p className="text-gray-600 pl-7">{faq.answer}</p>
              </div>
            ))}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Request a Demo
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              See FlatFund Pro in action. Fill out the form below and we'll get back to you within 24 hours.
            </p>
            <div className="inline-flex items-center gap-3 bg-amber-50 px-6 py-3 rounded-xl border-2 border-amber-200">
              <QrCode className="w-6 h-6 text-amber-600" />
              <span className="text-sm font-medium text-gray-700">
                Share this page via QR code - scroll down for printable version
              </span>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 sm:p-12">
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

            <div className="hidden lg:flex flex-col items-center justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-amber-200">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Access</h3>
                  <p className="text-sm text-gray-600">Scan to request demo</p>
                </div>
                <QRCodeGenerator
                  url={typeof window !== 'undefined' ? `${window.location.origin}/marketing#demo` : 'https://flatfundpro.com/marketing#demo'}
                  size={220}
                  showDownload={true}
                  title="Request Demo"
                  subtitle="FlatFund Pro"
                />
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center leading-relaxed mb-3">
                    Perfect for printing on flyers, posters, or sharing at society meetings
                  </p>
                  <button
                    onClick={() => handleNavigate('/qr-print')}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    View All QR Templates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/flatfundpro-2-logo.jpeg" alt="FlatFund Pro" className="h-12 object-contain drop-shadow-md" />
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
