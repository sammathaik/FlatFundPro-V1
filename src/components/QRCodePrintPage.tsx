import { ArrowLeft, Printer, Download } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';

interface QRCodePrintPageProps {
  onBack?: () => void;
}

export default function QRCodePrintPage({ onBack }: QRCodePrintPageProps) {
  const demoUrl = typeof window !== 'undefined' ? `${window.location.origin}/marketing#demo` : 'https://flatfundpro.com/marketing#demo';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg print:shadow-none print:border-2 print:border-gray-300 flex flex-col items-center">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img src="/flatfundpro-logo.svg" alt="FlatFund Pro" className="h-14 object-contain drop-shadow-md" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">FlatFund Pro</h1>
              <p className="text-sm text-blue-600 font-medium">Smart Payment Management</p>
            </div>

            <QRCodeGenerator
              url={demoUrl}
              size={280}
              showDownload={false}
              title="Request Demo"
              subtitle="Scan to get started"
            />

            <div className="mt-6 pt-6 border-t border-gray-200 w-full">
              <h3 className="font-bold text-gray-900 text-center mb-3">Why Choose FlatFund Pro?</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Track payments in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Generate instant reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Complete transparency</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">✓</span>
                  <span>Setup in 5 minutes</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 w-full text-center">
              <p className="text-xs text-gray-500">
                Trusted by 100+ Apartment Societies
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg print:shadow-none print:border-2 print:border-gray-300 flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Quick Demo Access</h2>
              <p className="text-sm text-gray-600">Share at Society Meetings</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
              <QRCodeGenerator
                url={demoUrl}
                size={240}
                showDownload={false}
              />
            </div>

            <div className="space-y-3 text-sm text-gray-700 w-full">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-xl">📱</span>
                <div>
                  <p className="font-semibold text-blue-900">Step 1</p>
                  <p className="text-blue-800">Open camera on your phone</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-xl">📷</span>
                <div>
                  <p className="font-semibold text-green-900">Step 2</p>
                  <p className="text-green-800">Point at QR code</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-xl">✨</span>
                <div>
                  <p className="font-semibold text-blue-900">Step 3</p>
                  <p className="text-blue-800">Fill demo request form</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 w-full text-center">
              <p className="text-xs font-semibold text-gray-900 mb-1">Contact Us</p>
              <p className="text-xs text-gray-600">contact@flatfundpro.com</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-lg print:shadow-none text-white flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Join 100+</h2>
              <h3 className="text-2xl font-bold mb-2">Apartment Societies</h3>
              <p className="text-blue-100">Already using FlatFund Pro</p>
            </div>

            <div className="bg-white rounded-xl p-6 mb-8 w-full">
              <QRCodeGenerator
                url={demoUrl}
                size={200}
                showDownload={false}
              />
            </div>

            <div className="space-y-4 w-full">
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-2xl font-bold mb-1">95.8%</p>
                <p className="text-sm text-blue-100">Average Collection Rate</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-2xl font-bold mb-1">10+ hrs</p>
                <p className="text-sm text-blue-100">Saved Every Month</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                <p className="text-2xl font-bold mb-1">Zero</p>
                <p className="text-sm text-blue-100">Manual Errors</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg print:shadow-none print:border-2 print:border-gray-300 flex flex-col">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Large Format Print</h2>
              <p className="text-sm text-gray-600">For Notice Boards & Posters</p>
            </div>

            <div className="flex-1 flex items-center justify-center py-8 bg-gray-50 rounded-xl mb-6">
              <QRCodeGenerator
                url={demoUrl}
                size={320}
                showDownload={false}
              />
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              <p className="font-semibold text-center text-gray-900">Perfect for:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Society notice boards
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Monthly newsletters
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Lift announcements
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  WhatsApp group sharing
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg print:shadow-none print:border-2 print:border-gray-300 flex flex-col">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Flyer Format</h2>
              <p className="text-sm text-gray-600">A5 Size Handout</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-4">
                <img src="/flatfundpro-logo.svg" alt="FlatFund Pro" className="h-18 object-contain mx-auto mb-3 drop-shadow-md" />
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">Simplify Payment</h3>
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">Management</h3>
              </div>

              <QRCodeGenerator
                url={demoUrl}
                size={200}
                showDownload={false}
              />

              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-gray-900 mb-1">Scan for Free Demo</p>
                <p className="text-xs text-gray-600">No credit card required</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs text-center">
              <div>
                <p className="font-bold text-blue-600">14-Day</p>
                <p className="text-gray-600">Free Trial</p>
              </div>
              <div>
                <p className="font-bold text-blue-600">5-Min</p>
                <p className="text-gray-600">Setup</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-lg print:shadow-none flex flex-col">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Dark Theme</h2>
              <p className="text-sm text-gray-400">For Digital Displays</p>
            </div>

            <div className="flex-1 flex items-center justify-center py-6">
              <div className="bg-white rounded-xl p-6">
                <QRCodeGenerator
                  url={demoUrl}
                  size={240}
                  showDownload={false}
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-lg font-bold mb-1">Request Your Demo</p>
                <p className="text-sm text-gray-400">Scan QR code to get started</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-300">contact@flatfundpro.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 no-print">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Printing Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Use high-quality paper (200gsm or higher) for professional results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Print in color for best QR code scanning reliability</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Test the QR code after printing to ensure it scans correctly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Place QR codes at eye level for easy scanning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>Avoid placing QR codes behind glass or in direct sunlight</span>
            </li>
          </ul>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
