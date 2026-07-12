import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  FileText, 
  HelpCircle, 
  Settings, 
  LogOut,
  User,
  BookOpen,
  ChevronRight,
  Sparkles,
  Palette,
  CheckSquare,
  Network,
  Mail
} from 'lucide-react';
import { PageId, DocumentItem } from '../types';

interface SidebarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  activeDoc: DocumentItem | null;
  onLogout: () => void;
  userEmail: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  setCurrentPage,
  activeDoc,
  onLogout,
  userEmail
}) => {
  const getInitials = (email: string) => {
    if (!email) return 'G';
    return email.charAt(0).toUpperCase();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresDoc: false },
    { id: 'library', label: 'Document Library', icon: Files, requiresDoc: false },
    { id: 'tasks_dashboard', label: 'Task & Reminders', icon: CheckSquare, requiresDoc: false },
    { id: 'multi_chat', label: 'Multi-Doc Chat', icon: MessageSquare, requiresDoc: false },
    { id: 'email_automation', label: 'Email Automation', icon: Mail, requiresDoc: false },
    { id: 'automation_center', label: 'Automation Agent', icon: Sparkles, requiresDoc: true },
    { id: 'viewer', label: 'Document Annotator', icon: Palette, requiresDoc: true },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, requiresDoc: true },
    { id: 'summary', label: 'AI Summary', icon: FileText, requiresDoc: true },
    { id: 'quiz', label: 'Quiz Generator', icon: HelpCircle, requiresDoc: true },
    { id: 'knowledge_graph', label: 'Knowledge Graph', icon: Network, requiresDoc: true }
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col z-40 p-4">
      {/* Brand Logo */}
      <div 
        onClick={() => setCurrentPage('landing')} 
        className="flex items-center space-x-2 px-2 py-4 cursor-pointer group"
        id="sidebar-logo"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white">SmartDocs</span>
          <span className="text-[10px] font-bold text-brand-cyan ml-1 px-1 py-0.2 rounded bg-brand-cyan/10">AI</span>
        </div>
      </div>

      {/* Active Document Status */}
      <div className="mt-4 mb-6 px-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
          Active Document
        </div>
        {activeDoc ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-brand-purple/15 border border-brand-purple/20">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{activeDoc.title}</div>
              <div className="text-[10px] text-brand-cyan uppercase font-bold">{activeDoc.type}</div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse shrink-0 ml-1.5" />
          </div>
        ) : (
          <div 
            onClick={() => setCurrentPage('library')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-brand-purple/20 hover:bg-brand-purple/5 transition-all cursor-pointer group"
          >
            <span className="text-xs text-gray-400 group-hover:text-gray-300">Select or upload file</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-purple group-hover:translate-x-0.5 transition-all" />
          </div>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isDocNeeded = item.requiresDoc && !activeDoc;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isDocNeeded) {
                  setCurrentPage(item.id as PageId);
                } else {
                  setCurrentPage('library');
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-brand-purple to-brand-purple/70 text-white shadow-md shadow-brand-purple/10'
                  : isDocNeeded
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              id={`sidebar-link-${item.id}`}
              disabled={false} /* handle redirection internally for better UX */
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-purple'}`} />
                <span>{item.label}</span>
              </div>
              {isDocNeeded && (
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-500 font-bold shrink-0">
                  Select File
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pro Plan promo banner */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-brand-purple/10 to-brand-cyan/10 border border-brand-purple/20 rounded-2xl p-4">
          <div className="text-xs font-semibold text-brand-purple uppercase tracking-widest mb-1">Pro Plan</div>
          <div className="text-xs text-gray-400 mb-3 leading-relaxed">85% of usage used. Upgrade for unlimited documents.</div>
          <button 
            onClick={() => alert("Upgrading to premium plan features...")}
            className="w-full py-2 bg-white text-black text-xs font-bold rounded-lg cursor-pointer hover:bg-gray-100 active:scale-95 transition-all"
          >
            Upgrade Now
          </button>
        </div>
      </div>

      {/* Footer Settings & User Card */}
      <div className="mt-auto space-y-1 pt-4 border-t border-white/5">
        <button
          onClick={() => setCurrentPage('settings')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            currentPage === 'settings'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
          id="sidebar-link-settings"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          id="sidebar-link-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>

        {/* User Card */}
        <div 
          onClick={() => setCurrentPage('profile')}
          className="flex items-center space-x-3 p-2.5 mt-3 rounded-xl bg-white/5 border border-white/5 hover:border-brand-cyan/20 hover:bg-brand-cyan/5 transition-all cursor-pointer group"
          id="sidebar-user-card"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-purple flex items-center justify-center shadow-inner text-sm font-bold text-white group-hover:scale-105 transition-transform">
            {getInitials(userEmail)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              {userEmail ? userEmail.split('@')[0] : 'Guest User'}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              {userEmail || 'guest@smartdocs.ai'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
