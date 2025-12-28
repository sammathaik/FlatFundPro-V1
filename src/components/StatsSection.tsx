import { TrendingUp, Users, Clock, Award } from 'lucide-react';
import { useState, useEffect } from 'react';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
}

function StatItem({ icon, value, label, suffix = '', prefix = '' }: StatItemProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setCount(Math.min(Math.floor(increment * currentStep), value));
      } else {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
          {icon}
        </div>
      </div>
      <div className="text-4xl font-bold text-gray-900 mb-2">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section id="benefits" className="py-20 px-4 bg-gradient-to-br from-amber-50 to-orange-50 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Trusted by Society Members
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join hundreds of residents who have simplified their maintenance payment submissions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatItem
            icon={<Users className="w-7 h-7 text-white" />}
            value={500}
            suffix="+"
            label="Active Residents"
          />
          <StatItem
            icon={<TrendingUp className="w-7 h-7 text-white" />}
            value={1200}
            suffix="+"
            label="Payments Processed"
          />
          <StatItem
            icon={<Clock className="w-7 h-7 text-white" />}
            value={30}
            label="Seconds Average Time"
          />
          <StatItem
            icon={<Award className="w-7 h-7 text-white" />}
            value={99}
            suffix="%"
            label="Success Rate"
          />
        </div>

        <div className="mt-16 bg-white rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Why Residents Love This System
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">No More Manual Entry</p>
                    <p className="text-sm text-gray-600">Stop typing long transaction IDs manually</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Instant Confirmation</p>
                    <p className="text-sm text-gray-600">Get immediate acknowledgment of your submission</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Track Your History</p>
                    <p className="text-sm text-gray-600">All submissions are securely stored for future reference</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Save Time & Effort</p>
                    <p className="text-sm text-gray-600">Complete submissions in under 30 seconds</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-8 text-center">
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-2">
                2 Days
              </div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                Average Processing Time
              </p>
              <p className="text-sm text-gray-600">
                Your payment proof is reviewed and records are updated within 2 business days of submission
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
