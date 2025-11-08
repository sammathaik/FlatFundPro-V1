import { Building2, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
}

export default function Header({ onLogoClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-amber-100">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="/FlatFundPro-2-Logo.jpeg"
              alt="FlatFund Pro"
              className="h-16 sm:h-20 md:h-24 w-auto object-contain"
            />
          </button>

          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2 hover:shadow-xl transition-shadow">
              <Building2 className="w-5 h-5" />
              <span className="font-bold text-sm tracking-wide">Society Management System</span>
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div className="flex sm:hidden items-center">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
