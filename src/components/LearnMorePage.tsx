import {
  ArrowRight,
  Users,
  Calendar,
  MessageCircle,
  FileQuestion,
  Shield,
  RefreshCw,
  CheckCircle,
  Clock,
  Smartphone,
  Eye,
  TrendingUp,
  AlertCircle,
  Award,
  Building2,
  Heart,
  QrCode,
  Zap,
  Brain,
  FileSearch,
  BarChart3,
  Bell,
  Link,
  Home,
  Upload
} from 'lucide-react';
import { useState } from 'react';
import UniversalLoginModal from './UniversalLoginModal';

interface LearnMorePageProps {
  onNavigate?: (path: string) => void;
  onRequestDemo?: () => void;
}

export default function LearnMorePage({ onNavigate, onRequestDemo }: LearnMorePageProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-indigo-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/flatfunprologo.jpg"
              alt="FlatFund Pro Logo"
              className="h-16 sm:h-20 w-auto rounded-xl shadow-lg bg-white p-2"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md mb-6">
            <Heart className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Built for Real Housing Societies</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Why FlatFund Pro Exists
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            A governance continuity backbone designed to work despite committee changes,
            resident churn, and real-world housing society behavior.
          </p>

          {onNavigate && (
            <button
              onClick={() => onNavigate('/')}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mx-auto"
            >
              ← Back to Home
            </button>
          )}
        </div>
      </section>

      {/* Section 1: Why Governance Breaks */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full mb-4">
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">THE STRUCTURAL PROBLEM</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Governance Breaks in Housing Societies
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Most housing apps fail because they ignore these structural realities
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-50 rounded-2xl p-8 border-l-4 border-red-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Annual Committee Changes</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Committee roles are voluntary and often thankless. Members juggle full-time professional
                    jobs while managing society finances in their personal time. Every year, committees change.
                  </p>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-red-400">
                    <p className="text-gray-800 font-semibold mb-2">What happens during handovers:</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span>Knowledge and institutional memory are lost</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span>Payment records and follow-up histories disappear</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span>Governance and discipline weaken</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span>New committees start from scratch</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border-l-4 border-orange-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Owner & Tenant Churn</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Owners and tenants change frequently in unregulated and semi-regulated communities.
                    There's limited formal onboarding. Contact details quickly become outdated.
                  </p>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-orange-400">
                    <p className="text-gray-800 font-semibold mb-2">The communication breakdown:</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>New occupants are unaware of payment processes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>Email addresses and phone numbers change without notice</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>Payment reminders reach the wrong people</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600">•</span>
                        <span>Historical payment records become disconnected</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border-l-4 border-yellow-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">WhatsApp-Based Communication Chaos</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Society WhatsApp groups are the most preferred communication medium. Important financial
                    communication becomes scattered across messages, calls, and individual chats.
                  </p>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-400">
                    <p className="text-gray-800 font-semibold mb-2">What gets lost:</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>Payment confirmations buried in chat history</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>Decisions and follow-ups disappear in message scroll</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>No audit trail for financial communications</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        <span>Dispute resolution becomes "he said, she said"</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border-l-4 border-blue-500">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileQuestion className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Dependency on Individuals Instead of Systems</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Payment reconciliation and follow-ups consume personal time. Committee members spend
                    hours matching screenshots to flats, chasing defaulters, and maintaining Excel sheets.
                  </p>
                  <div className="bg-white rounded-lg p-4 border-l-4 border-blue-400">
                    <p className="text-gray-800 font-semibold mb-2">The invisible burden:</p>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Screenshots arrive without flat numbers or names</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Treasurers manually match transaction IDs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>Disputes arise from unclear records</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>When that person leaves, knowledge walks out the door</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: What FlatFund Pro Solves */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full mb-4">
              <Shield className="w-4 h-4" />
              <span className="font-semibold text-sm">THE FLATFUND PRO SOLUTION</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How FlatFund Pro Works Despite These Realities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A system designed for continuity, not dependency on perfect behavior
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <RefreshCw className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Preserves Continuity Across Committee Handovers</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Complete financial and communication records survive beyond individuals. Payment histories,
                approval workflows, and audit trails remain intact.
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold">Incoming committees inherit clarity, not chaos.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Maintains Records Despite Resident Churn</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Flat-based tracking means payment history stays connected to the property, not the person.
                When residents change, their payment records remain accessible to new occupants and the committee.
              </p>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-900 font-semibold">Residents experience consistency even during transitions.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Turns WhatsApp Into a Governed Channel</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Opt-in WhatsApp communication with complete audit trails. Payment acknowledgments, reminders,
                and status updates become structured, not scattered.
              </p>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-sm text-indigo-900 font-semibold">Communication becomes documented, not lost in chat.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Reduces Dependency on Individuals</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                AI-assisted validation automatically extracts transaction details. Automated workflows handle
                acknowledgments and reminders. The system works even when key people are unavailable.
              </p>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-900 font-semibold">Governance survives people changes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Modern Features That Make It Work */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full mb-4">
              <Zap className="w-4 h-4" />
              <span className="font-semibold text-sm">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Modern Tools for Effortless Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Advanced technology that simplifies payment collection and committee workflows
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">QR Code Payments</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Generate unique QR codes for each flat. Residents scan and pay in seconds without manual data entry. Share via WhatsApp or print on notices.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Mobile Login</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Residents access their account using just mobile number + OTP. No passwords to remember. Perfect for quick payments on the go.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI Fraud Detection</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Automatic analysis of payment screenshots detects image manipulation, duplicates, and suspicious patterns. Flags risks for committee review.
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border-2 border-indigo-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <FileSearch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Document Classification</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                AI automatically identifies payment type: UPI screenshot, bank transfer, cheque, cash receipt. Helps committees quickly verify and categorize.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Flat Management</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Owners with multiple flats get one unified login. Switch between properties seamlessly. View separate payment history for each flat.
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 border-2 border-cyan-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Flexible Collection Modes</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Three modes: Equal amount for all, Area-based (per sqft), Type-based (by BHK). Choose what fits your society's rules and regulations.
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border-2 border-yellow-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Notifications</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Automated payment reminders, approval confirmations, and status updates via email and WhatsApp. Notification Center for residents.
              </p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border-2 border-pink-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Link className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Public Status Sharing</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Generate public links showing live collection progress. Residents view payment status without login. Perfect transparency for all.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 border-2 border-teal-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">PDF & Image Support</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Upload payment proof in any format: JPG, PNG, or PDF. Bank statements, UPI screenshots, or receipts—all accepted up to 5MB.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How FlatFund Pro Fits Real Behavior */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
              <Smartphone className="w-4 h-4" />
              <span className="font-semibold text-sm">DESIGNED FOR REAL PEOPLE</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Works With Real Behavior, Not Against It
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              FlatFund Pro meets residents where they are
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">1</div>
              <div className="bg-white rounded-xl p-6 flex-1 shadow-md border border-blue-100">
                <h4 className="font-bold text-gray-900 mb-2">QR Codes Make Payments Instant</h4>
                <p className="text-gray-600">
                  Scan a QR code and payment details auto-fill. No typing flat numbers or names. Share QR codes via WhatsApp, email, or print on notice boards. Perfect for residents who prefer speed over forms.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
              <div className="bg-white rounded-xl p-6 flex-1 shadow-md border border-blue-100">
                <h4 className="font-bold text-gray-900 mb-2">Mobile-First, Login Optional</h4>
                <p className="text-gray-600">
                  Quick mobile login with OTP for residents who want to track history. Public payment forms for those who prefer anonymity. Works on any device—mobile, tablet, or desktop.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div className="bg-white rounded-xl p-6 flex-1 shadow-md border border-blue-100">
                <h4 className="font-bold text-gray-900 mb-2">AI Extracts Details Automatically</h4>
                <p className="text-gray-600">
                  OCR extracts transaction IDs, amounts, and dates from screenshots. Document classification identifies payment types. Fraud detection flags suspicious submissions. Committees review, not transcribe.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
              <div className="bg-white rounded-xl p-6 flex-1 shadow-md border border-blue-100">
                <h4 className="font-bold text-gray-900 mb-2">Committees Stay in Control</h4>
                <p className="text-gray-600">
                  AI assists, humans decide. Committee review panels provide full audit trails. Override fraud flags when verified. Edit submissions with documented reasons. Technology empowers, never replaces judgment.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">5</div>
              <div className="bg-white rounded-xl p-6 flex-1 shadow-md border border-blue-100">
                <h4 className="font-bold text-gray-900 mb-2">Opt-In Communication, Complete Transparency</h4>
                <p className="text-gray-600">
                  Residents choose WhatsApp notifications or stick with email. Public status links show collection progress without login. Notification Center keeps everyone informed. Choice and transparency combined.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Why This Matters Long-Term */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full mb-4">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold text-sm">LONG-TERM IMPACT</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              The Compounding Benefits Over Time
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              FlatFund Pro becomes more valuable the longer you use it
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Incoming Committees Inherit Clarity</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Year after year, new committee members see complete payment histories, communication records,
                and governance decisions. They don't start from scratch. They build on what came before.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Disputes Reduce Over Time</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Complete audit trails mean "I paid" is never disputed. Payment acknowledgments are timestamped.
                Communication history is searchable. Conflicts resolve with facts, not memory.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Residents Experience Consistency</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Payment processes don't change with committee changes. Communication remains professional.
                New residents get the same experience as long-term owners. Continuity builds trust.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-gray-900">Governance Survives People Changes</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Society management becomes institutional, not personal. Rules and processes live in the system.
                Knowledge doesn't walk out the door when individuals leave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: For Residents */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-4">
              <Smartphone className="w-4 h-4" />
              <span className="font-semibold text-sm">FOR RESIDENTS</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Fast, Frictionless Payments
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              All this governance continuity works silently in the background
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm">Scan QR Code</h4>
                <p className="text-gray-600 text-xs">Instant access, no typing needed</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm">Quick Mobile Login</h4>
                <p className="text-gray-600 text-xs">Mobile number + OTP, done in 30 seconds</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm">Upload Proof</h4>
                <p className="text-gray-600 text-xs">Screenshots, PDFs, or bank statements</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm">Get Notified</h4>
                <p className="text-gray-600 text-xs">Instant confirmation via email or WhatsApp</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
              <p className="text-lg text-gray-800 font-bold mb-3">
                Three Ways to Pay: QR Code, Mobile Login, or Public Form
              </p>
              <p className="text-gray-600 mb-4">
                No app installation required. No password to remember. Track payment status anytime from Notification Center or public links.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <span className="bg-white px-4 py-2 rounded-full text-gray-700 font-medium">Works on Any Device</span>
                <span className="bg-white px-4 py-2 rounded-full text-gray-700 font-medium">Login Optional</span>
                <span className="bg-white px-4 py-2 rounded-full text-gray-700 font-medium">Instant Feedback</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Built for Real Housing Societies<br />— Including During Change
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            FlatFund Pro is a payment integrity and communication backbone that preserves continuity
            across committee changes, resident churn, and real-world behavior.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onNavigate && (
              <button
                onClick={() => {
                  onNavigate('/');
                  setTimeout(() => {
                    const section = document.getElementById('payment-form');
                    if (section) {
                      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            {onRequestDemo && (
              <button
                onClick={onRequestDemo}
                className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center border-2 border-white/30"
              >
                Request Demo
                <Calendar className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={scrollToTop}
              className="px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 justify-center"
            >
              Back to Top
              <Eye className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-6 text-blue-100 text-sm">
            Already have an account? <button
              onClick={() => setShowLoginModal(true)}
              className="underline hover:text-white font-semibold transition-colors"
            >
              Sign In
            </button>
          </p>
        </div>
      </section>

      {/* Universal Login Modal */}
      <UniversalLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(roles, occupantData) => {
          setShowLoginModal(false);
          if (onNavigate) {
            if (occupantData) {
              sessionStorage.setItem('occupant_session', JSON.stringify(occupantData));
              onNavigate('/occupant/dashboard');
            } else if (roles.length === 1) {
              const roleMap: Record<string, string> = {
                super_admin: '/super-admin',
                admin: '/admin',
              };
              onNavigate(roleMap[roles[0]] || '/');
            } else if (roles.length > 1) {
              onNavigate('/role-selection');
            }
          }
        }}
      />
    </div>
  );
}
