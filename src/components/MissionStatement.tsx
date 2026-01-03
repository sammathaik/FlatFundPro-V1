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
            A payment governance and integrity platform purpose-built for housing societies
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 shadow-lg">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full mb-6">
                <Target className="w-4 h-4" />
                <span className="font-semibold text-sm">Our Mission</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Treating Payments as Financial Records, Not Just Transactions
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                FlatFund Pro was built to solve a critical problem in housing society management:
                inaccurate or unverifiable payment submissions that lead to manual reconciliation errors,
                disputes, and lack of accountability.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                We believe payments should be verifiable, traceable, and accurate from submission to approval.
                FlatFund Pro is not a general-purpose society app—it's a specialized verification engine
                where accuracy and accountability matter.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Built for Verification</h4>
                    <p className="text-gray-600 text-sm">
                      OCR-based document understanding, business-rule validation, and automated
                      inconsistency detection ensure payment accuracy.
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
                    <h4 className="font-bold text-gray-900 mb-2">Governance First</h4>
                    <p className="text-gray-600 text-sm">
                      Committee review workflows, approval tracking, and comprehensive audit trails
                      provide transparency and dispute resolution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                <p className="font-semibold mb-2">Not for everyone</p>
                <p className="text-sm text-blue-100">
                  FlatFund Pro is designed for societies that prioritize payment accuracy,
                  committee oversight, and financial accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
