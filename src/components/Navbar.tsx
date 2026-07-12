import React from 'react';
import { BookOpen, Sparkles, ArrowRight, Menu, X } from 'lucide-react';
import { PageId } from '../types';

interface NavbarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  isLoggedIn,
  onLogout
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/40 backdrop-blur-md border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => setCurrentPage('landing')} 
          className="flex items-center space-x-2 cursor-pointer group"
          id="nav-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-brand-purple bg-clip-text text-transparent">
              SmartDocs
            </span>
            <span className="text-xs font-bold text-brand-cyan ml-1 px-1.5 py-0.5 rounded bg-brand-cyan/10">
              AI
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <button 
            onClick={() => setCurrentPage('landing')}
            className={`text-sm font-medium transition-colors hover:text-white ${
              currentPage === 'landing' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Home
          </button>
          <a 
            href="#features" 
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Features
          </a>
          <a 
            href="#faq" 
            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            FAQ
          </a>
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="px-4 py-2 text-sm font-medium text-brand-cyan hover:text-brand-cyan/80 transition-colors"
                id="nav-btn-dashboard"
              >
                Workspace
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                id="nav-btn-logout"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentPage('auth')}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                id="nav-btn-login"
              >
                Log In
              </button>
              <button
                onClick={() => setCurrentPage('auth')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple hover:to-brand-purple text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 flex items-center space-x-2 border border-white/10 group active:scale-95 transition-all"
                id="nav-btn-getstarted"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-white focus:outline-none"
            id="nav-toggle"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass-panel border-t border-white/5 py-4 px-6 space-y-4">
          <button
            onClick={() => {
              setCurrentPage('landing');
              setIsOpen(false);
            }}
            className="block w-full text-left py-2 text-sm text-gray-300 hover:text-white"
          >
            Home
          </button>
          <a
            href="#features"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm text-gray-300 hover:text-white"
          >
            Features
          </a>
          <a
            href="#faq"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm text-gray-300 hover:text-white"
          >
            FAQ
          </a>
          <div className="pt-4 border-t border-white/5 flex flex-col space-y-3">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('dashboard');
                    setIsOpen(false);
                  }}
                  className="w-full text-center py-2.5 rounded-xl border border-brand-cyan/20 text-brand-cyan text-sm font-medium"
                >
                  Workspace
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full text-center py-2.5 text-gray-400 text-sm font-medium"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setCurrentPage('auth');
                    setIsOpen(false);
                  }}
                  className="w-full text-center py-2.5 text-gray-300 text-sm font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('auth');
                    setIsOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-brand-purple text-sm font-semibold text-white text-center shadow-lg shadow-brand-purple/20"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
