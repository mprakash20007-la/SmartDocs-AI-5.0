import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, Menu, X, Bell, Zap } from 'lucide-react';
import { PageId } from '../types';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Home', action: () => setCurrentPage('landing'), active: currentPage === 'landing' },
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-black/70 backdrop-blur-2xl border-b border-white/8 py-3 shadow-elevation-md'
        : 'bg-brand-dark/30 backdrop-blur-md border-b border-white/5 py-4'
    } px-6`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <motion.div
          onClick={() => setCurrentPage('landing')}
          className="flex items-center space-x-2.5 cursor-pointer group"
          id="nav-logo"
          whileTap={{ scale: 0.96 }}
        >
          <div className={`rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-purple-glow group-hover:scale-105 transition-all duration-300 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'}`}>
            <BookOpen className={`text-white transition-all ${scrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className={`font-black tracking-tight bg-gradient-to-r from-white via-white to-brand-purple bg-clip-text text-transparent transition-all ${scrolled ? 'text-lg' : 'text-xl'}`}>
              SmartDocs
            </span>
            <span className="text-[10px] font-bold text-brand-cyan px-1.5 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/20">
              AI
            </span>
          </div>
        </motion.div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link, idx) =>
            link.href ? (
              <a
                key={idx}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-1 left-4 right-4 h-px bg-gradient-to-r from-brand-purple to-brand-cyan scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
              </a>
            ) : (
              <button
                key={idx}
                onClick={link.action}
                className={`relative px-4 py-2 text-sm font-medium transition-colors group ${
                  link.active ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
                {link.active && (
                  <span className="absolute bottom-1 left-4 right-4 h-px bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full" />
                )}
                {!link.active && (
                  <span className="absolute bottom-1 left-4 right-4 h-px bg-gradient-to-r from-brand-purple to-brand-cyan scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full" />
                )}
              </button>
            )
          )}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Live status pill */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-soft" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Gemini Live</span>
          </div>

          {isLoggedIn ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  id="nav-bell"
                >
                  <Bell className="w-4.5 h-4.5" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-purple rounded-full animate-pulse" />
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-72 glass-panel-strong rounded-2xl p-4 space-y-3 shadow-elevation-lg border border-white/10 z-50"
                    >
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                        <Bell className="w-3.5 h-3.5 text-brand-purple" />
                        <span>Notifications</span>
                      </div>
                      {[
                        { icon: '✅', msg: 'Automation complete', time: '2m ago', color: 'text-emerald-400' },
                        { icon: '📄', msg: 'New document processed', time: '8m ago', color: 'text-brand-cyan' },
                        { icon: '🎯', msg: 'Quiz results ready', time: '1h ago', color: 'text-brand-purple' },
                      ].map((n, i) => (
                        <div key={i} className="flex items-start space-x-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                          <span className="text-sm">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-medium">{n.msg}</p>
                            <p className={`text-[10px] ${n.color} font-semibold mt-0.5`}>{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setCurrentPage('dashboard')}
                className="px-4 py-2 text-sm font-semibold text-brand-cyan hover:text-brand-cyan/80 transition-colors"
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
              <motion.button
                onClick={() => setCurrentPage('auth')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 text-sm font-bold text-white shadow-purple-glow flex items-center space-x-2 group border border-brand-purple/20"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                id="nav-btn-getstarted"
              >
                <Zap className="w-4 h-4 text-brand-cyan" />
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-white focus:outline-none rounded-xl hover:bg-white/5 transition-all"
            id="nav-toggle"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-0 right-0 glass-panel-strong border-t border-white/5 overflow-hidden"
          >
            <div className="py-4 px-6 space-y-3">
              {navLinks.map((link, idx) =>
                link.href ? (
                  <a key={idx} href={link.href} onClick={() => setIsOpen(false)} className="block py-2 text-sm text-gray-300 hover:text-white font-medium">
                    {link.label}
                  </a>
                ) : (
                  <button key={idx} onClick={() => { link.action?.(); setIsOpen(false); }} className="block w-full text-left py-2 text-sm text-gray-300 hover:text-white font-medium">
                    {link.label}
                  </button>
                )
              )}
              <div className="pt-4 border-t border-white/5 flex flex-col space-y-3">
                {isLoggedIn ? (
                  <>
                    <button onClick={() => { setCurrentPage('dashboard'); setIsOpen(false); }} className="w-full text-center py-2.5 rounded-xl border border-brand-cyan/20 text-brand-cyan text-sm font-semibold">Workspace</button>
                    <button onClick={() => { onLogout(); setIsOpen(false); }} className="w-full text-center py-2.5 text-gray-400 text-sm font-medium">Log Out</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setCurrentPage('auth'); setIsOpen(false); }} className="w-full text-center py-2.5 text-gray-300 text-sm font-medium">Log In</button>
                    <button onClick={() => { setCurrentPage('auth'); setIsOpen(false); }} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 text-sm font-bold text-white text-center shadow-purple-glow">Get Started</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
export default Navbar;
