import React from 'react';
import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  FileText, 
  HelpCircle, 
  Settings, 
  LogOut,
  BookOpen,
  ChevronRight,
  Sparkles,
  Palette,
  CheckSquare,
  Network,
  Mail,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageId, DocumentItem } from '../types';

interface SidebarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  activeDoc: DocumentItem | null;
  onLogout: () => void;
  userEmail: string;
  totalDocs?: number;
}

// SVG circular progress ring
const StorageRing: React.FC<{ used: number; total: number }> = ({ used, total }) => {
  const pct = Math.min(used / total, 1);
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct);
  const color = pct > 0.8 ? '#f87171' : pct > 0.5 ? '#f59e0b' : '#22d3ee';

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx="26" cy="26" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        className="progress-ring-circle"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="26" y="30" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Outfit, sans-serif">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  activeDoc,
  onLogout,
  userEmail,
  totalDocs = 0
}) => {
  const getInitials = (email: string) => {
    if (!email) return 'G';
    return email.charAt(0).toUpperCase();
  };

  const coreItems = [
    { id: 'dashboard',       label: 'Dashboard',       icon: LayoutDashboard, requiresDoc: false },
    { id: 'library',         label: 'Document Library', icon: Files,           requiresDoc: false },
    { id: 'tasks_dashboard', label: 'Task & Reminders', icon: CheckSquare,     requiresDoc: false },
    { id: 'multi_chat',      label: 'Multi-Doc Chat',  icon: MessageSquare,   requiresDoc: false },
    { id: 'email_automation',label: 'Email Automation', icon: Mail,            requiresDoc: false },
  ];

  const docItems = [
    { id: 'automation_center', label: 'Automation Agent',   icon: Sparkles,  requiresDoc: true },
    { id: 'viewer',            label: 'Doc Annotator',      icon: Palette,   requiresDoc: true },
    { id: 'chat',              label: 'AI Chat',            icon: MessageSquare, requiresDoc: true },
    { id: 'summary',           label: 'AI Summary',         icon: FileText,  requiresDoc: true },
    { id: 'quiz',              label: 'Quiz Generator',     icon: HelpCircle,requiresDoc: true },
    { id: 'knowledge_graph',   label: 'Knowledge Graph',    icon: Network,   requiresDoc: true },
  ];

  const renderNavItem = (item: typeof coreItems[0]) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const isDocNeeded = item.requiresDoc && !activeDoc;

    return (
      <motion.button
        key={item.id}
        onClick={() => setCurrentPage(isDocNeeded ? 'library' : item.id as PageId)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
          isActive
            ? 'bg-gradient-to-r from-brand-purple/25 to-brand-cyan/5 text-white shadow-purple-glow nav-active-indicator'
            : isDocNeeded
            ? 'text-gray-600 cursor-default'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
        id={`sidebar-link-${item.id}`}
        whileTap={!isDocNeeded ? { scale: 0.97 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${
            isActive ? 'text-brand-cyan' : isDocNeeded ? 'text-gray-700' : 'text-gray-500 group-hover:text-brand-purple'
          }`} />
          <span className="truncate text-xs font-semibold">{item.label}</span>
        </div>
        {isDocNeeded ? (
          <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-600 font-bold shrink-0">
            Need File
          </span>
        ) : isActive ? (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse shrink-0" />
        ) : null}
      </motion.button>
    );
  };

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-white/5 flex flex-col z-40 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, rgba(10,5,20,0.97) 0%, rgba(5,5,15,0.98) 100%)', backdropFilter: 'blur(32px)' }}
    >
      {/* Top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-purple/50 to-transparent" />

      {/* Brand Logo */}
      <div
        onClick={() => setCurrentPage('landing')}
        className="flex items-center space-x-2.5 px-4 py-5 cursor-pointer group shrink-0"
        id="sidebar-logo"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-purple-glow group-hover:scale-105 transition-all">
          <BookOpen className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex items-baseline space-x-1">
          <span className="text-base font-black tracking-tight text-white">SmartDocs</span>
          <span className="text-[9px] font-bold text-brand-cyan px-1.5 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/20">AI</span>
        </div>
      </div>

      {/* Active Document Card */}
      <div className="px-3 mb-4 shrink-0">
        <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-2 px-1">Active Context</div>
        {activeDoc ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2.5 p-3 rounded-xl bg-gradient-to-r from-brand-purple/15 to-brand-cyan/5 border border-brand-purple/20"
          >
            <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-brand-purple" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{activeDoc.title}</div>
              <div className="text-[9px] text-brand-cyan uppercase font-bold mt-0.5 flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                <span>{activeDoc.type} · Active</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div
            onClick={() => setCurrentPage('library')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-brand-purple/25 hover:bg-brand-purple/5 transition-all cursor-pointer group"
          >
            <span className="text-xs text-gray-500 group-hover:text-gray-300 font-medium">Select or upload file</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
          </div>
        )}
      </div>

      <div className="px-3 mb-1 shrink-0">
        <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 py-2">
        {/* Core Section */}
        <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold px-2 pb-1.5 pt-1">Core</div>
        {coreItems.map(renderNavItem)}

        {/* Document Tools Section */}
        <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold px-2 pb-1.5 pt-4">Document Tools</div>
        {docItems.map(renderNavItem)}
      </nav>

      {/* Storage Ring Card */}
      <div className="px-3 mb-3 shrink-0">
        <div className="bg-white/3 border border-white/6 rounded-2xl p-3.5 flex items-center space-x-3">
          <StorageRing used={totalDocs} total={25} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-white mb-0.5">{totalDocs} / 25 Files</div>
            <div className="text-[9px] text-gray-500 font-medium leading-snug">Storage used</div>
            <button
              onClick={() => setCurrentPage('library')}
              className="mt-1.5 text-[9px] font-bold text-brand-cyan hover:text-brand-cyan/80 flex items-center space-x-1 transition-colors"
            >
              <span>Manage Library</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Pro Plan promo */}
      <div className="px-3 mb-3 shrink-0">
        <div className="bg-gradient-to-br from-brand-purple/12 to-brand-cyan/8 border border-brand-purple/20 rounded-2xl p-3.5">
          <div className="flex items-center space-x-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="text-[9px] font-bold text-brand-purple uppercase tracking-widest">Pro Plan</span>
          </div>
          <div className="text-[10px] text-gray-400 mb-2.5 leading-relaxed">Unlock unlimited docs, priority AI & advanced analytics.</div>
          <button
            onClick={() => alert('Upgrading to Pro...')}
            className="w-full py-2 bg-gradient-to-r from-brand-purple to-brand-purple/70 text-white text-[10px] font-bold rounded-xl cursor-pointer hover:from-brand-purple hover:to-brand-purple active:scale-95 transition-all shadow-purple-glow"
          >
            Upgrade to Pro ✦
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 shrink-0 border-t border-white/5 pt-3">
        <button
          onClick={() => setCurrentPage('settings')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentPage === 'settings' ? 'bg-white/8 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
          id="sidebar-link-settings"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          id="sidebar-link-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        {/* User Card */}
        <motion.div
          onClick={() => setCurrentPage('profile')}
          className="flex items-center space-x-3 p-2.5 mt-1 rounded-xl bg-white/4 border border-white/6 hover:border-brand-cyan/20 hover:bg-brand-cyan/5 transition-all cursor-pointer group"
          id="sidebar-user-card"
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-inner text-sm font-black text-white group-hover:scale-105 transition-transform shrink-0">
            {getInitials(userEmail)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">
              {userEmail ? userEmail.split('@')[0] : 'Guest User'}
            </div>
            <div className="text-[9px] text-gray-500 truncate font-medium">
              {userEmail || 'guest@smartdocs.ai'}
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-brand-cyan transition-colors shrink-0" />
        </motion.div>
      </div>
    </aside>
  );
};
export default Sidebar;
