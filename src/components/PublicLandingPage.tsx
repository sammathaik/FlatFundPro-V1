import { useRef, useState } from 'react';
import Header from './Header';
import HeroSection from './HeroSection';
import MissionStatement from './MissionStatement';
import WhyFlatFundPro from './WhyFlatFundPro';
import KeyAdvantages from './KeyAdvantages';
import AboutFlatFundPro from './AboutFlatFundPro';
import HowItWorks from './HowItWorks';
import StatsSection from './StatsSection';
import ResidentPaymentGateway from './ResidentPaymentGateway';
import PortalAccessSection from './PortalAccessSection';
import ChatBot from './ChatBot';
import UniversalLoginModal from './UniversalLoginModal';
import DemoRequestModal from './DemoRequestModal';

interface PublicLandingPageProps {
  onNavigate: (path: string) => void;
}

export default function PublicLandingPage({ onNavigate }: PublicLandingPageProps) {
  const formRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      <Header
        onLogoClick={scrollToTop}
        onLoginClick={() => setShowLoginModal(true)}
        onDemoClick={() => setShowDemoModal(true)}
        onLearnMoreClick={() => onNavigate('/learn-more')}
        onNavigate={onNavigate}
      />
      <div ref={heroRef as React.RefObject<HTMLDivElement>} className="pt-20">
        <HeroSection
          onGetStarted={scrollToForm}
          onRequestDemo={() => setShowDemoModal(true)}
        />
      </div>
      <MissionStatement />
      <WhyFlatFundPro />
      <KeyAdvantages />
      <HowItWorks />
      <StatsSection />
      <div ref={formRef as React.RefObject<HTMLDivElement>}>
        <ResidentPaymentGateway onNavigate={onNavigate} />
      </div>

      <PortalAccessSection onNavigate={onNavigate} />

      <footer className="bg-gray-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2024 FlatFund Pro. All rights reserved.</p>
            <p className="mt-2 text-xs text-gray-500">Payment governance built for accountability.</p>
          </div>
        </div>
      </footer>

      <ChatBot userRole="guest" />

      <UniversalLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onNavigateToOccupant={() => {
          setShowLoginModal(false);
          onNavigate('/occupant');
        }}
        onLoginSuccess={(roles, occupantData) => {
          setShowLoginModal(false);
          if (roles.length === 1) {
            const roleMap: Record<string, string> = {
              super_admin: '/super-admin',
              admin: '/admin',
              resident: '/occupant/dashboard'
            };
            // For resident login, the occupant data is already stored in sessionStorage
            onNavigate(roleMap[roles[0]] || '/');
          } else {
            onNavigate('/role-selection');
          }
        }}
      />

      <DemoRequestModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onNavigateToFullPage={() => onNavigate('/request-demo')}
      />
    </div>
  );
}
