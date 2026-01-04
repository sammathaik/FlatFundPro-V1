import { Users, UserX, MessageCircle, Calendar, FileQuestion, RefreshCw, AlertTriangle, Shield } from 'lucide-react';

export default function WhyFlatFundPro() {
  const challenges = [
    {
      icon: Calendar,
      title: 'Committee Changes Every Year',
      problem: 'Voluntary committee members rotate annually. Knowledge, records, and processes are lost during handovers.',
      reality: 'Incoming committees start from scratch'
    },
    {
      icon: UserX,
      title: 'Owner & Tenant Churn',
      problem: 'Residents move in and out frequently. Contact details become outdated. New occupants are unaware of processes.',
      reality: 'Communication breaks with every move'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp Dependency',
      problem: 'Society WhatsApp groups are the primary communication channel. Important financial discussions get lost in chat history.',
      reality: 'Decisions disappear in message scroll'
    },
    {
      icon: FileQuestion,
      title: 'Screenshot Chaos',
      problem: 'Residents send payment screenshots without context. Committee members spend personal time matching payments to flats.',
      reality: 'Manual reconciliation consumes hours'
    }
  ];

  return (
    <section id="why-flatfund-pro" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full mb-4">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-sm">THE REAL PROBLEM</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Housing Societies Need This
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Most society management breaks down because it depends on people who change,
            not systems that endure.
          </p>
        </div>

        {/* Challenges Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {challenges.map((challenge, index) => {
            const Icon = challenge.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {challenge.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      {challenge.problem}
                    </p>
                    <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
                      <RefreshCw className="w-4 h-4" />
                      {challenge.reality}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* The FlatFund Pro Difference */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Shield className="w-10 h-10 text-blue-600" />
            <h3 className="text-3xl font-bold text-gray-900">
              FlatFund Pro Works Despite These Realities
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Preserves Continuity Across Changes</h4>
                  <p className="text-gray-600">
                    Complete financial and communication records survive committee handovers.
                    New members inherit clarity, not chaos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Works Without Perfect Adoption</h4>
                  <p className="text-gray-600">
                    Accepts screenshots, PDFs, manual transfers. Residents don't need to install apps
                    or change their behavior.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Turns WhatsApp Into Structured Communication</h4>
                  <p className="text-gray-600">
                    Opt-in WhatsApp notifications with audit trails. Communication becomes governed,
                    not scattered.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Reduces Dependency on Individuals</h4>
                  <p className="text-gray-600">
                    AI-assisted validation and automated workflows mean less dependency on who's
                    currently managing the society.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Maintains Records Despite Resident Churn</h4>
                  <p className="text-gray-600">
                    Flat-based tracking means payment history stays intact even when owners
                    and tenants change.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Committee Reviews at Their Own Time</h4>
                  <p className="text-gray-600">
                    Asynchronous workflows respect that committee members have full-time jobs.
                    No urgent midnight WhatsApp messages.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <p className="text-lg text-gray-800 font-semibold mb-2">
              Built for real housing societies — including during change.
            </p>
            <p className="text-gray-600">
              FlatFund Pro is a governance continuity backbone, not just another society app.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
