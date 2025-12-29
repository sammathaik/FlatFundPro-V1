import { Building2, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onLogoClick?: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
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
              src="/flatfundpro-2-logo.jpeg"
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
              onClick={() => scrollToSection('about')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              About
            </button>
            <div className="relative group">
              <button className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Learn More
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-blue-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => scrollToSection('features')}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  Benefits
                </button>
              </div>
            </div>
          </nav>

          {/* Tagline Badge - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="font-bold text-sm">Smart Society Management</span>
            </div>
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
              onClick={() => scrollToSection('about')}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              About
            </button>
            <button
              onClick={() => setLearnMoreOpen(!learnMoreOpen)}
              className="flex items-center justify-between w-full px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium rounded-lg transition-colors"
            >
              Learn More
              <ChevronDown className={`w-4 h-4 transition-transform ${learnMoreOpen ? 'rotate-180' : ''}`} />
            </button>
            {learnMoreOpen && (
              <div className="pl-4 space-y-1">
                <button
                  onClick={() => scrollToSection('features')}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('benefits')}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                >
                  Benefits
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
