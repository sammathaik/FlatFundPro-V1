import { useRef } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import AboutFlatFundPro from './AboutFlatFundPro';
import HowItWorks from './HowItWorks';
import StatsSection from './StatsSection';
import ResidentPaymentGateway from './ResidentPaymentGateway';
import PortalAccessSection from './PortalAccessSection';
import ChatBot from './ChatBot';

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
      <AboutFlatFundPro />
      <HowItWorks />
      <StatsSection />
      <div ref={formRef as React.RefObject<HTMLDivElement>}>
        <ResidentPaymentGateway />
      </div>

      {/* Portal Access Section - New dedicated section */}
      <PortalAccessSection onNavigate={onNavigate} />

      {/* Simple, clean footer */}
      <footer className="bg-gray-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2024 FlatFund Pro. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-500">Simplifying society management, one payment at a time.</p>
          </div>
        </div>
      </footer>

      {/* Chatbot for guests */}
      <ChatBot userRole="guest" />
    </div>
  );
}
