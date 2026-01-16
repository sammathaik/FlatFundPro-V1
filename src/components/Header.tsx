import { Building2, Menu, X, ChevronDown, LogIn, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  onDemoClick?: () => void;
  onLearnMoreClick?: () => void;
  onNavigate?: (path: string) => void;
}

export default function Header({ onLogoClick, onLoginClick, onDemoClick, onLearnMoreClick, onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
      setLearnMoreOpen(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-md border-b-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={onLogoClick}
            className="flex items-center gap-3 hover:opacity-90 transition-all transform hover:scale-105 flex-shrink-0"
          >
            <img
              src="/ffp-logo.jpg"
              alt="FlatFund Pro"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
            />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center">
            <button
              onClick={() => onLogoClick?.()}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('why-flatfund-pro')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Why FlatFund Pro
            </button>
            <button
              onClick={onLearnMoreClick}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Learn More
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Key Benefits
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onDemoClick}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Request Demo
            </button>
            <button
              onClick={onLoginClick}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 py-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => {
                onLogoClick?.();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('why-flatfund-pro')}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              Why FlatFund Pro
            </button>
            <button
              onClick={() => {
                onLearnMoreClick?.();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              Learn More
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              Key Benefits
            </button>

            <div className="pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  onDemoClick?.();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-3 text-blue-600 hover:bg-blue-50 font-medium rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                Request Demo
              </button>
              <button
                onClick={() => {
                  onLoginClick?.();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
