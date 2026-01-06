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
  Heart
} from 'lucide-react';

interface LearnMorePageProps {
  onNavigate?: (path: string) => void;
  onRequestDemo?: () => void;
}

export default function LearnMorePage({ onNavigate, onRequestDemo }: LearnMorePageProps) {
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

      {/* Section 3: How FlatFund Pro Fits Real Behavior */}
      <section className="py-20 px-4 bg-white">
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
              <div className="bg-gray-50 rounded-xl p-6 flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Accepts Screenshots, PDFs, Manual Transfers</h4>
                <p className="text-gray-600">
                  Residents can submit payment proof the way they already do. No forced app installation,
                  no complex processes. Upload a screenshot, and you're done.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">2</div>
              <div className="bg-gray-50 rounded-xl p-6 flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Works Even If Residents Don't Install Apps</h4>
                <p className="text-gray-600">
                  Payment submission works through simple web forms or WhatsApp sharing. No resident login required.
                  The system captures and validates without forcing behavior change.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">3</div>
              <div className="bg-gray-50 rounded-xl p-6 flex-1">
                <h4 className="font-bold text-gray-900 mb-2">AI-Assisted Validation Reduces Ambiguity</h4>
                <p className="text-gray-600">
                  OCR technology automatically extracts transaction IDs, amounts, and dates from screenshots.
                  Committee members review, not manually type. Time savings compound over months.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">4</div>
              <div className="bg-gray-50 rounded-xl p-6 flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Keeps Humans in Control</h4>
                <p className="text-gray-600">
                  AI assists, but doesn't decide. Committee members review and approve payments. Fraud detection
                  flags risks, but committees override when appropriate. Technology supports, doesn't replace.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">5</div>
              <div className="bg-gray-50 rounded-xl p-6 flex-1">
                <h4 className="font-bold text-gray-900 mb-2">Supports Opt-In WhatsApp Communication</h4>
                <p className="text-gray-600">
                  Residents choose whether to receive WhatsApp notifications. Those who opt in get structured
                  updates. Those who don't can use email or check status pages. Choice, not force.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Why This Matters Long-Term */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
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

      {/* Section 5: For Residents */}
      <section className="py-20 px-4 bg-white">
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

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">1</div>
                <h4 className="font-bold text-gray-900 mb-2">Submit Payment</h4>
                <p className="text-gray-600 text-sm">Upload screenshot with name and flat number</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">2</div>
                <h4 className="font-bold text-gray-900 mb-2">Get Acknowledgment</h4>
                <p className="text-gray-600 text-sm">Receive instant confirmation via email or WhatsApp</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">3</div>
                <h4 className="font-bold text-gray-900 mb-2">Track Status</h4>
                <p className="text-gray-600 text-sm">Check public status pages anytime</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg text-gray-800 font-semibold mb-4">
                No app installation. No login required. No behavior change.
              </p>
              <p className="text-gray-600">
                For residents, FlatFund Pro is invisible. It just works.
              </p>
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
                onClick={() => onNavigate('/')}
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
          {onNavigate && (
            <p className="mt-6 text-blue-100 text-sm">
              Committee Members: <button
                onClick={() => onNavigate('/admin/login')}
                className="underline hover:text-white font-semibold transition-colors"
              >
                Sign In to Admin Portal
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
