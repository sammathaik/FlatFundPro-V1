import { useRef } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import HowItWorks from './HowItWorks';
import StatsSection from './StatsSection';
import DynamicPaymentForm from './DynamicPaymentForm';

interface PublicLandingPageProps {
  onNavigate: (path: string) => void;
}

export default function PublicLandingPage({ onNavigate }: PublicLandingPageProps) {
  const formRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      <Header onLogoClick={scrollToTop} />
      <div ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-20">
        <HeroSection onGetStarted={scrollToForm} />
      </div>
      <HowItWorks />
      <StatsSection />
      <div ref={formRef as React.RefObject<HTMLDivElement>}>
        <DynamicPaymentForm />
      </div>

      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-6">
            <button
              onClick={() => onNavigate('/marketing')}
              className="text-white hover:text-amber-300 font-medium text-sm transition-colors border border-white hover:border-amber-300 px-6 py-3 rounded-lg"
            >
              Learn More About FlatFund Pro →
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <button
              onClick={() => onNavigate('/admin')}
              className="text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors border border-amber-400 hover:border-amber-300 px-6 py-3 rounded-lg"
            >
              Apartment Admin Login →
            </button>
            <button
              onClick={() => onNavigate('/super-admin')}
              className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors border border-emerald-400 hover:border-emerald-300 px-6 py-3 rounded-lg"
            >
              Super Admin Login →
            </button>
          </div>
          <div className="text-center mt-6 text-gray-400 text-xs">
            <p>© 2024 FlatFund Pro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
