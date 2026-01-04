import { Target, Shield, TrendingUp } from 'lucide-react';

export default function MissionStatement() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            What is FlatFund Pro?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A governance continuity backbone for unregulated and semi-regulated housing societies
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full mb-6">
                <Target className="w-4 h-4" />
                <span className="font-semibold text-sm">Built for Real Societies</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Designed for Committees That Change and Residents Who Move
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Most housing societies face committee turnover, owner and tenant churn, and WhatsApp-based
                communication that scatters important financial information. FlatFund Pro was built to work
                <strong> despite these realities</strong>, not assuming perfect stability.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We preserve governance continuity across people changes. Payment records, communication history,
                and institutional knowledge survive beyond individuals. Incoming committees inherit clarity, not chaos.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Preserves Continuity</h4>
                    <p className="text-gray-600 text-sm">
                      Complete financial and communication records survive committee handovers.
                      Governance doesn't reset when people change.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Works With Real Behavior</h4>
                    <p className="text-gray-600 text-sm">
                      Accepts screenshots, works without app installation, structures WhatsApp communication.
                      Meets residents where they are.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                <p className="font-semibold mb-2">Not a general society app</p>
                <p className="text-sm text-blue-100">
                  FlatFund Pro is a payment integrity and governance backbone.
                  Built for societies that need continuity beyond individuals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
