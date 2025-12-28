import { Building2, Shield, Zap, Users, BarChart3, CheckCircle } from 'lucide-react';

export default function AboutFlatFundPro() {
  return (
    <section id="about" className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl mb-6 shadow-lg">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About FlatFund Pro
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            The complete society management platform designed to simplify maintenance collection,
            payment tracking, and community administration for apartment complexes of all sizes.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-8 md:p-12 mb-12 shadow-lg">
          <h3 className="text-3xl font-bold text-gray-900 mb-4 text-center">Our Mission</h3>
          <p className="text-lg text-gray-700 leading-relaxed text-center max-w-4xl mx-auto">
            We're transforming how apartment societies manage their finances by eliminating manual processes,
            reducing errors, and providing complete transparency. FlatFund Pro empowers administrators and
            residents alike with modern tools that make community management effortless.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-blue-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">Secure & Reliable</h4>
            <p className="text-gray-600 leading-relaxed">
              Bank-grade encryption protects your data. Role-based access ensures only authorized users
              can view sensitive information. Your society's data is always safe.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-green-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h4>
            <p className="text-gray-600 leading-relaxed">
              Setup your entire society in minutes. Process payments instantly. Generate reports in seconds.
              FlatFund Pro is built for speed without compromising on features.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-amber-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">User Friendly</h4>
            <p className="text-gray-600 leading-relaxed">
              No technical skills required. Intuitive interface that anyone can use. If you can use WhatsApp,
              you can use FlatFund Pro. Simple for residents, powerful for admins.
            </p>
          </div>
        </div>

        {/* What Makes Us Different */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Makes Us Different</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h5 className="font-bold text-gray-900 mb-2">Complete Transparency</h5>
                <p className="text-gray-600">
                  Public payment status pages let everyone see collection progress. No more questions
                  about who paid and who didn't.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h5 className="font-bold text-gray-900 mb-2">Automated Workflows</h5>
                <p className="text-gray-600">
                  Smart reminders, auto-detection of payment proofs, fraud detection, and automated
                  acknowledgments save hours of manual work.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h5 className="font-bold text-gray-900 mb-2">Multi-Level Access</h5>
                <p className="text-gray-600">
                  Super Admin, Apartment Admin, and Occupant portals ensure everyone has the right
                  tools for their role without overwhelming complexity.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h5 className="font-bold text-gray-900 mb-2">Comprehensive Analytics</h5>
                <p className="text-gray-600">
                  Real-time dashboards, collection summaries, fraud pattern analysis, and executive
                  reports give you insights that drive better decisions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Who We Serve */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-8 md:p-12 shadow-lg">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Who We Serve</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <Building2 className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Apartment Societies</h4>
              <p className="text-gray-600 text-sm">
                From 20 flats to 500+ units, we scale with your needs. Perfect for residential complexes
                of any size.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <Users className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Society Administrators</h4>
              <p className="text-gray-600 text-sm">
                Treasurers, secretaries, and committee members who need powerful tools to manage
                collections efficiently.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <BarChart3 className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-lg">Property Managers</h4>
              <p className="text-gray-600 text-sm">
                Professional property management companies handling multiple societies with centralized
                oversight.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600 mb-6">
            Join hundreds of societies that trust FlatFund Pro for their financial management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Explore Features
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-gray-200"
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
