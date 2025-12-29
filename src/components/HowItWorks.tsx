import { Upload, Scan, CheckCircle2 } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 bg-white scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to submit your maintenance payment proof
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/4 left-1/3 right-1/3 h-1 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200"></div>

          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                1
              </div>
            </div>
            <div className="mt-8 mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Upload className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Upload Screenshot
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              Simply upload your payment screenshot along with your basic details like name and flat number. No manual entry of transaction IDs needed.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                2
              </div>
            </div>
            <div className="mt-8 mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Scan className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Auto-Detect Transaction
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              Our intelligent system automatically scans and extracts your transaction ID, payment date, and amount from the screenshot.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                3
              </div>
            </div>
            <div className="mt-8 mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Records Updated
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              Your payment is verified and the society's offline records are updated automatically within 2 business days.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-3xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Save Time, Skip the Hassle
          </h3>
          <p className="text-gray-700 text-lg max-w-3xl mx-auto">
            No more manual filling of transaction IDs or waiting in long queues. Our automated system handles everything for you, making maintenance payments a breeze.
          </p>
        </div>
      </div>
    </section>
  );
}
