import { CheckCircle, Shield, Users, BarChart3, Bell, FileCheck } from 'lucide-react';

export default function KeyAdvantages() {
  const advantages = [
    {
      icon: CheckCircle,
      title: 'Accurate & Verifiable Payments',
      description: 'OCR-based validation ensures payment proof accuracy and reduces manual reconciliation errors'
    },
    {
      icon: Shield,
      title: 'Fraud Detection & Risk Signals',
      description: 'Built-in inconsistency detection flags suspicious submissions before they reach approval'
    },
    {
      icon: Users,
      title: 'Committee Review Workflows',
      description: 'Structured approval processes with override capabilities for committee members'
    },
    {
      icon: Bell,
      title: 'Consent-Based Notifications',
      description: 'WhatsApp and email notifications with resident opt-in controls for transparency'
    },
    {
      icon: FileCheck,
      title: 'Strong Audit Trails',
      description: 'Complete history of submissions, approvals, and changes for dispute resolution'
    },
    {
      icon: BarChart3,
      title: 'Forecasting & Planning',
      description: 'Budget planning and collection tracking readiness for proactive governance'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-4">
            <span className="font-bold text-sm">VERIFY • GOVERN • SCALE</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why FlatFund Pro?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Purpose-built advantages that go beyond simple payment collection
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantages.map((advantage, index) => {
            const Icon = advantage.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {advantage.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {advantage.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-100">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Is FlatFund Pro Right for Your Society?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <p className="text-gray-700 text-sm">
                  You need accurate payment verification
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <p className="text-gray-700 text-sm">
                  Committee approval workflows are important
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <p className="text-gray-700 text-sm">
                  Audit trails and accountability matter
                </p>
              </div>
            </div>
            <p className="mt-6 text-gray-600">
              If these priorities resonate with your committee, FlatFund Pro is built for you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
