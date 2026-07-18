import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  FileText, 
  HelpCircle, 
  Settings, 
  User, 
  Check, 
  AlertCircle,
  Clock,
  ChevronRight,
  Shield,
  HelpCircle as FaqIcon,
  Globe,
  Bell,
  Trash2,
  Lock,
  Search,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Folder,
  FolderOpen,
  CheckSquare,
  Activity,
  Calendar,
  Play,
  TrendingUp,
  Compass,
  Award,
  Square,
  Network,
  Zap,
  Star,
  Users,
  Cpu,
  Database,
  BarChart2,
  CheckCircle2,
  Rocket,
  Crown,
  Brain,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PageId, DocumentItem, UserStats, Task, Reminder, AutomationHistoryEntry, DocumentCategory } from './types';
import GlassCard from './components/GlassCard';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import SummaryView from './components/SummaryView';
import QuizView from './components/QuizView';
import DocumentViewer from './components/DocumentViewer';

// New enterprise components
import TaskDashboard from './components/TaskDashboard';
import AutomationCenter from './components/AutomationCenter';
import KnowledgeGraph from './components/KnowledgeGraph';
import MultiDocChat from './components/MultiDocChat';
import EmailAutomation from './components/EmailAutomation';
import { CandidateQuiz } from './components/CandidateQuiz';
import { CandidateInterview } from './components/CandidateInterview';

// Pre-defined testimonials & FAQs
const testimonials = [
  {
    name: 'Sarah Jenkins',
    role: 'Medical Student, Johns Hopkins',
    quote: 'SmartDocs AI saved me countless hours. I upload entire chapters and get instant summaries and test quizzes. My recall score improved by 35%!',
    avatar: 'S',
    stars: 5,
    color: 'from-brand-purple/20 to-brand-cyan/5'
  },
  {
    name: 'David Chen',
    role: 'Equity Research Analyst',
    quote: 'The Gemini-powered precision is incredible. It parses balance sheets and reports instantly, letting me verify complex details via natural language chat.',
    avatar: 'D',
    stars: 5,
    color: 'from-brand-cyan/15 to-brand-purple/5'
  },
  {
    name: 'Priya Nair',
    role: 'Senior Legal Counsel, TechCorp',
    quote: 'Contract review that used to take my team 3 days now takes 20 minutes. The AI extracts clauses, flags risks, and drafts response emails automatically.',
    avatar: 'P',
    stars: 5,
    color: 'from-amber-500/10 to-brand-purple/5'
  },
  {
    name: 'Marcus Webb',
    role: 'PhD Researcher, MIT CSAIL',
    quote: 'The knowledge graph feature is mind-blowing. It maps concept relationships across 50+ research papers and surfaces connections I would have missed entirely.',
    avatar: 'M',
    stars: 5,
    color: 'from-emerald-500/10 to-brand-cyan/5'
  }
];

const faqs = [
  {
    q: 'How does SmartDocs AI read my documents?',
    a: 'We leverage the advanced multimodal capabilities of Google Gemini 2.5 Flash. PDFs, DOCX, and TXTs are analyzed with exact semantic intelligence, preventing hallucinations.'
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. Your document content is stored strictly inside your private cloud instance and is never used to train public AI models. We follow SOC2 compliance principles.'
  },
  {
    q: 'What file formats are supported?',
    a: 'We currently support PDF, DOCX, and TXT files up to 50MB. Support for PPTX, XLSX, and image-based PDFs via OCR is coming in Q3 2026.'
  },
  {
    q: 'How accurate is the AI quiz generation?',
    a: 'Quiz questions are generated directly from the document context with Gemini grounding, achieving over 94% factual accuracy in internal testing.'
  }
];

const pricingTiers = [
  {
    name: 'Free',
    icon: Zap,
    price: '$0',
    period: 'forever',
    description: 'Perfect for individuals getting started.',
    color: 'text-gray-300',
    borderColor: 'border-white/8',
    bg: '',
    features: [
      '25 document uploads',
      'AI Chat per document',
      'Auto Summaries',
      'Quiz Generator',
      'Email Automation',
    ],
    cta: 'Get Started Free',
    ctaStyle: 'bg-white/8 border border-white/10 hover:bg-white/12 text-white',
    popular: false,
  },
  {
    name: 'Pro',
    icon: Crown,
    price: '$19',
    period: 'per month',
    description: 'For power users and growing teams.',
    color: 'text-brand-purple',
    borderColor: 'border-brand-purple/30',
    bg: 'pricing-card-popular',
    features: [
      'Unlimited documents',
      'Multi-Document AI Chat',
      'Knowledge Graph mapping',
      'Candidate Assessment suite',
      'Priority Gemini processing',
      'PDF export & email delivery',
    ],
    cta: 'Start Pro Trial',
    ctaStyle: 'bg-gradient-to-r from-brand-purple to-brand-purple/70 text-white shadow-purple-glow',
    popular: true,
  },
  {
    name: 'Enterprise',
    icon: Rocket,
    price: 'Custom',
    period: 'per seat',
    description: 'Full-scale deployment with SLAs.',
    color: 'text-brand-cyan',
    borderColor: 'border-brand-cyan/20',
    bg: '',
    features: [
      'Everything in Pro',
      'SSO & SAML auth',
      'Dedicated cloud instance',
      'Custom AI fine-tuning',
      'SLA + 24/7 support',
      'Audit logs & compliance',
    ],
    cta: 'Contact Sales',
    ctaStyle: 'bg-brand-cyan/10 border border-brand-cyan/25 hover:bg-brand-cyan/20 text-brand-cyan',
    popular: false,
  }
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // App data state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalDocuments: 0,
    totalChats: 0,
    totalQuizzes: 0,
    totalQuestionsAnswered: 0,
    averageScore: 0,
    streak: 3,
    knowledgeScore: 82
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Semantic search states
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<{ id: string; score: number; reason: string; }[] | null>(null);

  // Settings states
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('English');
  const [notifyState, setNotifyState] = useState(true);

  // Enterprise States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [automationHistory, setAutomationHistory] = useState<AutomationHistoryEntry[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isFoldersView, setIsFoldersView] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Academic: true, Business: true, Finance: true, Medical: true, Legal: true, Technical: true, Research: true, Personal: true
  });

  // Load state from backend on init & auth
  useEffect(() => {
    // Sync login state from localStorage
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
      setCurrentPage('dashboard');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDocuments();
      fetchStats();
      fetchTasks();
      fetchReminders();
      fetchAutomationHistory();
    }
  }, [isLoggedIn]);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          ...data,
          streak: prev.streak || 3,
          knowledgeScore: prev.knowledgeScore || 82
        }));
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        setReminders(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAutomationHistory = async () => {
    try {
      const res = await fetch('/api/automation/history');
      if (res.ok) {
        setAutomationHistory(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };



  const handleSelectDoc = async (id: string, pageToRedirect: PageId = 'chat') => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveDoc(data);
        setCurrentPage(pageToRedirect);
      }
    } catch (err) {
      console.error('Failed to fetch document details:', err);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click selection
    if (!confirm('Are you sure you want to delete this document and its associated quizzes/chats?')) return;

    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (activeDoc?.id === id) {
          setActiveDoc(null);
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleLogin = (email: string) => {
    localStorage.setItem('user_email', email);
    setUserEmail(email);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    setUserEmail('');
    setIsLoggedIn(false);
    setActiveDoc(null);
    setCurrentPage('landing');
  };

  const triggerSemanticSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingSemantic(true);
    try {
      const res = await fetch('/api/documents/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        setSemanticResults(data.results);
      } else {
        console.error('Semantic search failed');
      }
    } catch (err) {
      console.error('Error during semantic search:', err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  // Filtered documents list (Supports standard title match or AI semantic search)
  const filteredDocs = React.useMemo(() => {
    if (isSemanticSearch && semanticResults) {
      return documents
        .map(doc => {
          const match = semanticResults.find(r => r.id === doc.id);
          return {
            ...doc,
            semanticScore: match ? match.score : 0,
            semanticReason: match ? match.reason : ''
          };
        })
        .filter(doc => doc.semanticScore !== undefined && doc.semanticScore >= 20)
        .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0));
    }
    
    // Normal title matching
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery, isSemanticSearch, semanticResults]);

  // Check for candidate assessment view request
  const urlParams = new URLSearchParams(window.location.search);
  const assessId = urlParams.get('assessId');
  const [assessmentPhase, setAssessmentPhase] = useState<string | null>(() => urlParams.get('phase'));

  if (assessId) {
    if (assessmentPhase === 'interview') {
      return <CandidateInterview assessId={assessId} />;
    }
    return <CandidateQuiz assessId={assessId} onTransitionToInterview={() => setAssessmentPhase('interview')} />;
  }

  return (
    <div className={`min-h-screen relative overflow-x-hidden select-none bg-brand-dark ${darkMode ? 'dark' : ''}`}>
      {/* Background Ambient Aurora Circles — Enhanced */}
      <div className="absolute top-[-12%] left-[-8%] w-[55%] h-[55%] bg-purple-600/20 blur-[140px] rounded-full pointer-events-none z-0 animate-aurora" />
      <div className="absolute bottom-[-12%] right-[-8%] w-[45%] h-[45%] bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none z-0 animate-aurora-2" style={{ animationDelay: '-7s' }} />
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none z-0 animate-aurora" style={{ animationDelay: '-12s' }} />

      {/* Main Layout Manager */}
      {isLoggedIn && currentPage !== 'landing' ? (
        // Inner App Workspace (with Sidebar)
        <div className="flex z-10 relative">
          <Sidebar 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            activeDoc={activeDoc}
            onLogout={handleLogout}
            userEmail={userEmail}
            totalDocs={documents.length}
          />

          {/* Core scrollable content area */}
          <main className="flex-1 ml-64 p-8 min-h-screen">
            {/* Top Bar Header */}
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-white/5" id="workspace-header">
              <div>
                <h1 className="text-2xl font-extrabold text-white capitalize tracking-tight">
                  {currentPage === 'dashboard' && 'SmartDocs AI Dashboard'}
                  {currentPage === 'library' && 'Document Library'}
                  {currentPage === 'chat' && 'AI Context Chat'}
                  {currentPage === 'summary' && 'Knowledge Summaries'}
                  {currentPage === 'quiz' && 'Interactive Quizzes'}
                  {currentPage === 'profile' && 'User Progress'}
                  {currentPage === 'settings' && 'System Settings'}
                  {currentPage === 'automation_center' && 'AI Automation Center'}
                  {currentPage === 'tasks_dashboard' && 'Task & Reminders'}
                  {currentPage === 'multi_chat' && 'Multi-Document AI Chat'}
                  {currentPage === 'knowledge_graph' && 'AI Knowledge Graph'}
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  {currentPage === 'dashboard' && 'Access stats, actions, automation runs, and recent research.'}
                  {currentPage === 'library' && 'Upload, manage, and classify your files in folders.'}
                  {currentPage === 'chat' && `Chat directly with ${activeDoc?.title || 'your document'}.`}
                  {currentPage === 'summary' && `Review auto-extracted insights for ${activeDoc?.title || 'your file'}.`}
                  {currentPage === 'quiz' && `Test recalling metrics for ${activeDoc?.title || 'your file'}.`}
                  {currentPage === 'profile' && 'Review your usage volumes and scoring performance.'}
                  {currentPage === 'settings' && 'Configure custom application and API parameters.'}
                  {currentPage === 'automation_center' && `Execute the full AI workflow for ${activeDoc?.title || 'your file'}.`}
                  {currentPage === 'tasks_dashboard' && 'View auto-detected tasks and calendar reminders.'}
                  {currentPage === 'multi_chat' && 'Compare and chat across multiple documents simultaneously.'}
                  {currentPage === 'knowledge_graph' && `Interactive conceptual map of ${activeDoc?.title || 'your file'}.`}
                </p>
              </div>

              {/* Quick Workspace Stats */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Storage Used</div>
                  <div className="text-xs font-semibold text-brand-cyan">{documents.length} of 25 Files</div>
                </div>
              </div>
            </header>

            {/* Page Transitions & Active Workspace Page */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* 1. Dashboard View */}
                {currentPage === 'dashboard' && (
                  <div className="space-y-8" id="dashboard-page">
                    {/* Welcome Card banner — Enhanced */}
                    <GlassCard className="border border-brand-purple/25 relative overflow-hidden p-8" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(34,211,238,0.06) 60%, rgba(168,85,247,0.04) 100%)' }}>
                      {/* Decorative orbs */}
                      <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-56 h-56 bg-brand-purple/15 blur-3xl rounded-full pointer-events-none" />
                      <div className="absolute right-24 bottom-0 translate-y-6 w-32 h-32 bg-brand-cyan/10 blur-2xl rounded-full pointer-events-none" />
                      {/* Animated grid pattern */}
                      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                      <div className="max-w-xl space-y-4 relative">
                        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-purple/15 text-brand-purple text-[10px] font-bold uppercase tracking-widest border border-brand-purple/20">
                          <Sparkles className="w-3.5 h-3.5 text-brand-cyan shrink-0 animate-pulse" />
                          <span>Gemini Copilot Agent Hub · Powered by Gemini 2.5 Flash</span>
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
                          Enterprise AI Document
                          <span className="block gradient-text-animated">Automation Platform</span>
                        </h2>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          Deploy AI agents to read, classify, and extract structured knowledge, deadlines, and timeline guides from your manuals, proposals, or reports in one click.
                        </p>
                        <div className="pt-2 flex items-center space-x-3">
                          <motion.button
                            onClick={() => setCurrentPage('library')}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 text-white font-bold text-xs shadow-purple-glow flex items-center space-x-2 cursor-pointer"
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            id="dashboard-cta-upload"
                          >
                            <Zap className="w-3.5 h-3.5 text-brand-cyan" />
                            <span>Go to Library Vault</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            onClick={() => setCurrentPage('automation_center')}
                            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 text-white font-semibold text-xs flex items-center space-x-2 transition-all"
                            whileTap={{ scale: 0.97 }}
                          >
                            <Cpu className="w-3.5 h-3.5 text-brand-purple" />
                            <span>Run Automation</span>
                          </motion.button>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Stats counters row — Enhanced with gradient icons */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Vault Files', value: stats.totalDocuments, icon: Files, color: 'text-brand-purple', gradient: 'from-brand-purple/25 to-brand-purple/5', borderColor: 'border-brand-purple/20', glow: 'shadow-purple-glow' },
                        { label: 'Quizzes Done', value: stats.totalQuizzes, icon: HelpCircle, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-500/5', borderColor: 'border-emerald-500/20', glow: '' },
                        { label: 'Day Streak', value: `${stats.streak}🔥`, icon: TrendingUp, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-500/5', borderColor: 'border-amber-500/20', glow: '' },
                        { label: 'Knowledge', value: `${stats.knowledgeScore}%`, icon: Award, color: 'text-brand-cyan', gradient: 'from-brand-cyan/20 to-brand-cyan/5', borderColor: 'border-brand-cyan/20', glow: 'shadow-cyan-glow' }
                      ].map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
                          >
                            <GlassCard className={`p-5 flex items-center justify-between ${stat.glow}`} id={`stat-card-${idx}`}>
                              <div className="space-y-1">
                                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{stat.label}</span>
                                <div className="text-2xl font-black text-white">{stat.value}</div>
                              </div>
                              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} flex items-center justify-center ${stat.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                            </GlassCard>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* 7-Day Activity Heatmap */}
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <BarChart2 className="w-4 h-4 text-brand-purple" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">7-Day Activity</h3>
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold">This week</span>
                      </div>
                      <div className="flex items-end space-x-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                          const heights = [60, 85, 40, 95, 70, 30, 55];
                          const h = heights[i];
                          const isToday = i === new Date().getDay() - 1;
                          return (
                            <div key={day} className="flex-1 flex flex-col items-center space-y-1.5">
                              <div className="w-full rounded-t-md relative overflow-hidden" style={{ height: `${h * 0.8}px` }}>
                                <div
                                  className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all duration-700 ${
                                    isToday
                                      ? 'bg-gradient-to-t from-brand-purple to-brand-cyan animate-glow-pulse'
                                      : 'bg-gradient-to-t from-brand-purple/40 to-brand-purple/20'
                                  }`}
                                  style={{ height: '100%' }}
                                />
                              </div>
                              <span className={`text-[8px] font-bold uppercase ${isToday ? 'text-brand-cyan' : 'text-gray-600'}`}>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>

                    {/* Main Split Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Tasks & Recent Docs */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Action Tasks */}
                        <GlassCard className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                              <CheckSquare className="w-4 h-4 text-brand-purple" />
                              <span>Today's Actions & Submissions</span>
                            </h3>
                            <button 
                              onClick={() => setCurrentPage('tasks_dashboard')}
                              className="text-xs text-brand-cyan hover:underline font-bold"
                            >
                              Open Task Center
                            </button>
                          </div>
                          
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {tasks.filter(t => !t.completed).slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTask(task.id)}
                                className="p-3.5 rounded-xl border border-white/5 bg-white/5 hover:border-brand-purple/20 transition-all cursor-pointer flex items-center justify-between group"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <Square className="w-4 h-4 text-gray-500 group-hover:text-brand-purple transition-all shrink-0" />
                                  <span className="text-xs text-gray-300 font-semibold truncate">{task.title}</span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase tracking-widest font-extrabold">{task.type}</span>
                                  {task.date && <span className="text-[10px] text-brand-cyan font-bold">{task.date}</span>}
                                </div>
                              </div>
                            ))}
                            {tasks.filter(t => !t.completed).length === 0 && (
                              <div className="text-center py-6 text-xs text-gray-500 font-medium">
                                All tasks finished! Great job.
                              </div>
                            )}
                          </div>
                        </GlassCard>

                        {/* Recent Documents list */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Documents</h3>
                            <button 
                              onClick={() => setCurrentPage('library')}
                              className="text-xs text-brand-cyan hover:underline flex items-center space-x-1 font-bold"
                            >
                              <span>Manage Library</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            {documents.slice(0, 3).map((doc) => (
                              <div
                                key={doc.id}
                                onClick={() => handleSelectDoc(doc.id, 'automation_center')}
                                className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-brand-purple/30 hover:bg-brand-purple/5 transition-all cursor-pointer flex items-center justify-between group"
                                id={`recent-doc-${doc.id}`}
                              >
                                <div className="flex items-center space-x-3.5 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 border border-brand-purple/15 flex items-center justify-center text-brand-purple group-hover:scale-105 transition-transform shrink-0">
                                    <FileText className="w-5 h-5 text-brand-purple" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{doc.title}</div>
                                    <div className="flex items-center space-x-3 text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wider">
                                      <span className="text-brand-cyan">{doc.type}</span>
                                      <span>•</span>
                                      <span>{doc.size}</span>
                                      {doc.category && (
                                        <>
                                          <span>•</span>
                                          <span className="text-brand-purple">{doc.category}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-purple group-hover:translate-x-1 transition-all shrink-0" />
                              </div>
                            ))}

                            {documents.length === 0 && (
                              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                                <Files className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">No documents uploaded yet.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Reminders, History & Context Status */}
                      <div className="space-y-6">
                        {/* Context Status */}
                        <GlassCard className="p-5 space-y-4">
                          <div className="flex items-start space-x-3.5">
                            <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/15 shrink-0">
                              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-white">Active Workspace</h4>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                All AI services operate on your currently active working document.
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5 space-y-3">
                            {activeDoc ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/15">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-white truncate">{activeDoc.title}</div>
                                    <div className="text-[10px] text-brand-cyan uppercase mt-0.5 font-bold">{activeDoc.category || activeDoc.type}</div>
                                  </div>
                                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 shrink-0 font-semibold">{activeDoc.size}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => setCurrentPage('automation_center')}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-brand-purple/15 border border-white/5 hover:border-brand-purple/20 transition-all text-center flex flex-col items-center justify-center"
                                  >
                                    <Sparkles className="w-4 h-4 text-brand-purple mb-1 animate-pulse" />
                                    <span className="text-[9px] text-gray-400 font-bold">Automation</span>
                                  </button>
                                  <button
                                    onClick={() => setCurrentPage('knowledge_graph')}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-brand-purple/15 border border-white/5 hover:border-brand-purple/20 transition-all text-center flex flex-col items-center justify-center"
                                  >
                                    <Network className="w-4 h-4 text-brand-cyan mb-1" />
                                    <span className="text-[9px] text-gray-400 font-bold">Graph Map</span>
                                  </button>
                                  <button
                                    onClick={() => setCurrentPage('chat')}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-brand-purple/15 border border-white/5 hover:border-brand-purple/20 transition-all text-center flex flex-col items-center justify-center"
                                  >
                                    <MessageSquare className="w-4 h-4 text-green-400 mb-1" />
                                    <span className="text-[9px] text-gray-400 font-bold">AI Chat</span>
                                  </button>
                                  <button
                                    onClick={() => setCurrentPage('summary')}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-brand-purple/15 border border-white/5 hover:border-brand-purple/20 transition-all text-center flex flex-col items-center justify-center"
                                  >
                                    <FileText className="w-4 h-4 text-yellow-400 mb-1" />
                                    <span className="text-[9px] text-gray-400 font-bold">Summary</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-1.5" />
                                <p className="text-xs text-gray-500 font-medium">No file selected as active workspace.</p>
                                <button
                                  onClick={() => setCurrentPage('library')}
                                  className="mt-3.5 px-4.5 py-2 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 text-xs text-white font-bold transition-all"
                                >
                                  Select from Library
                                </button>
                              </div>
                            )}
                          </div>
                        </GlassCard>

                        {/* Reminders list */}
                        <GlassCard className="space-y-4">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <Bell className="w-4 h-4 text-brand-cyan" />
                            <span>Upcoming Alerts</span>
                          </h3>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {reminders.slice(0, 2).map((rem) => (
                              <div key={rem.id} className="p-3 rounded-xl border border-red-500/25 bg-red-500/5 text-xs">
                                <div className="flex items-center justify-between text-red-400 font-bold mb-1">
                                  <span className="uppercase text-[9px]">{rem.type}</span>
                                  <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-1" />{rem.date}</span>
                                </div>
                                <p className="text-white font-semibold">{rem.title}</p>
                              </div>
                            ))}
                            {reminders.length === 0 && (
                              <p className="text-xs text-gray-500 text-center py-4">No alerts set.</p>
                            )}
                          </div>
                        </GlassCard>

                        {/* Automation History logs */}
                        <GlassCard className="space-y-4">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-brand-purple" />
                            <span>Recent AI Workflows</span>
                          </h3>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {automationHistory.slice(0, 3).map((hist) => (
                              <div key={hist.id} className="p-3 rounded-xl border border-white/5 bg-white/5 text-[11px] flex items-center justify-between">
                                <div className="min-w-0 flex-1 pr-2">
                                  <span className="text-white font-bold block truncate">{hist.documentTitle}</span>
                                  <span className="text-gray-500 block text-[9px] mt-0.5">Speed: {(hist.executionTimeMs / 1000).toFixed(1)}s</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                                  hist.status === 'success' ? 'bg-green-500/25 text-green-400' : 'bg-red-500/25 text-red-400'
                                }`}>
                                  {hist.status}
                                </span>
                              </div>
                            ))}
                            {automationHistory.length === 0 && (
                              <p className="text-xs text-gray-500 text-center py-4">No workflows run.</p>
                            )}
                          </div>
                        </GlassCard>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Document Library View */}
                {currentPage === 'library' && (
                  <div className="space-y-6" id="library-page">
                    <DocumentUpload 
                      onUploadSuccess={(newDoc) => {
                        setDocuments(prev => [newDoc, ...prev]);
                        setActiveDoc(newDoc);
                        fetchStats();
                      }}
                    />

                    {/* Files table list */}
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Library Vault</h3>
                          
                          {/* Search mode toggler */}
                          <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsSemanticSearch(false);
                                setSemanticResults(null);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                                !isSemanticSearch
                                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/10'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              Title
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsSemanticSearch(true);
                                if (searchQuery.trim()) {
                                  triggerSemanticSearch(searchQuery);
                                }
                              }}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1 ${
                                isSemanticSearch
                                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/10'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Gemini AI</span>
                            </button>
                          </div>

                          {/* Layout mode toggler */}
                          <div className="flex items-center space-x-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                            <button
                              type="button"
                              onClick={() => setIsFoldersView(false)}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                                !isFoldersView
                                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/10'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              List
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsFoldersView(true)}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                                isFoldersView
                                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/10'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              Folders
                            </button>
                          </div>
                        </div>
                        
                        {/* Search input bar */}
                        <div className="flex items-center space-x-2 max-w-sm w-full">
                          <div className="relative flex-1">
                            {isSearchingSemantic ? (
                              <RefreshCw className="absolute left-3 top-2.5 w-4 h-4 text-brand-cyan animate-spin" />
                            ) : isSemanticSearch ? (
                              <Sparkles className="absolute left-3 top-2.5 w-4 h-4 text-brand-cyan" />
                            ) : (
                              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-500" />
                            )}
                            <input
                              type="text"
                              placeholder={isSemanticSearch ? "Search concepts, themes, or topics..." : "Search library..."}
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (isSemanticSearch) {
                                  setSemanticResults(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isSemanticSearch) {
                                  triggerSemanticSearch(searchQuery);
                                }
                              }}
                              className={`w-full bg-white/5 border focus:outline-none transition-all rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 ${
                                isSemanticSearch 
                                  ? 'border-brand-cyan/15 focus:border-brand-cyan/40' 
                                  : 'border-white/5 focus:border-brand-purple/30'
                              }`}
                              id="library-search"
                            />
                          </div>

                          {isSemanticSearch && (
                            <button
                              type="button"
                              disabled={isSearchingSemantic || !searchQuery.trim()}
                              onClick={() => triggerSemanticSearch(searchQuery)}
                              className="px-3 py-2 rounded-xl bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/20 text-brand-cyan text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center space-x-1"
                            >
                              {isSearchingSemantic ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Analyze</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Informational Hint for AI Search */}
                      {isSemanticSearch && !semanticResults && !isSearchingSemantic && searchQuery.trim() && (
                        <div className="text-right">
                          <p className="text-[10px] text-brand-cyan/70 italic animate-pulse">
                            Press Enter or click "Analyze" to query Gemini Semantic Search
                          </p>
                        </div>
                      )}

                      <div className="space-y-3">
                        {isLoadingDocs || isSearchingSemantic ? (
                          <div className="text-center py-12">
                            <RefreshCw className="w-8 h-8 text-brand-cyan animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-500">
                              {isSearchingSemantic ? "Consulting Gemini AI Library Index..." : "Querying Library Vault..."}
                            </p>
                          </div>
                        ) : isFoldersView ? (
                          (() => {
                            // Categorize documents
                            const folderGroups: Record<string, DocumentItem[]> = {
                              Academic: [], Business: [], Finance: [], Medical: [], Legal: [], Technical: [], Research: [], Personal: []
                            };
                            
                            // Map documents to folders, fallback to Personal
                            filteredDocs.forEach(doc => {
                              const cat = doc.category || 'Personal';
                              if (!folderGroups[cat]) folderGroups[cat] = [];
                              folderGroups[cat].push(doc);
                            });

                            const folderKeys = Object.keys(folderGroups).filter(key => folderGroups[key].length > 0);

                            if (folderKeys.length === 0) {
                              return (
                                <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                                  <Files className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                  <p className="text-xs text-gray-500">No documents match search or are uploaded.</p>
                                </div>
                              );
                            }

                            return folderKeys.map((cat) => {
                              const isExpanded = expandedFolders[cat] !== false;
                              const docsInFolder = folderGroups[cat];
                              return (
                                <div key={cat} className="space-y-2 border border-white/5 rounded-xl bg-white/2 p-2">
                                  {/* Folder Header */}
                                  <div
                                    onClick={() => toggleFolder(cat)}
                                    className="p-3 flex items-center justify-between cursor-pointer text-xs font-semibold text-white select-none hover:bg-white/5 rounded-lg"
                                  >
                                    <div className="flex items-center space-x-2">
                                      {isExpanded ? (
                                        <FolderOpen className="w-4.5 h-4.5 text-brand-cyan shrink-0" />
                                      ) : (
                                        <Folder className="w-4.5 h-4.5 text-brand-cyan shrink-0" />
                                      )}
                                      <span className="font-bold">{cat} Vault</span>
                                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-gray-400 font-bold shrink-0">{docsInFolder.length}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                  </div>

                                  {/* Folder Documents */}
                                  {isExpanded && (
                                    <div className="space-y-2 pl-4 pr-2 pb-2">
                                      {docsInFolder.map((doc) => {
                                        const isActive = activeDoc?.id === doc.id;
                                        return (
                                          <div
                                            key={doc.id}
                                            onClick={() => handleSelectDoc(doc.id, 'automation_center')}
                                            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group text-xs ${
                                              isActive 
                                                ? 'bg-brand-purple/15 border-brand-purple/35'
                                                : 'bg-white/5 border-white/5 hover:border-brand-purple/20 hover:bg-brand-purple/5'
                                            }`}
                                          >
                                            <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                                              <FileText className="w-4 h-4 text-brand-purple shrink-0" />
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-2">
                                                  <div className="font-semibold text-white truncate">{doc.title}</div>
                                                  {isSemanticSearch && doc.semanticScore !== undefined && (
                                                    <span className="text-[9px] px-1 py-0.2 bg-emerald-500/15 text-emerald-400 font-bold shrink-0">
                                                      {doc.semanticScore}% Match
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[9px] text-gray-500 mt-0.5 font-bold uppercase tracking-wider">
                                                  {doc.type} • {doc.size}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex items-center space-x-2 shrink-0">
                                              {doc.automationStatus?.status === 'running' && (
                                                <span className="text-[8px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded font-bold uppercase animate-pulse flex items-center space-x-1 border border-brand-purple/10 mr-1.5">
                                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-brand-cyan shrink-0" />
                                                  <span>Automating ({doc.automationStatus.progress}%)</span>
                                                </span>
                                              )}
                                              {isActive && (
                                                <span className="text-[8px] bg-brand-cyan/25 text-brand-cyan px-1.5 py-0.2 rounded font-bold uppercase">
                                                  active
                                                </span>
                                              )}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteDoc(doc.id, e);
                                                }}
                                                className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Document"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()
                        ) : (
                          <>
                            {filteredDocs.map((doc) => {
                              const isActive = activeDoc?.id === doc.id;
                              return (
                                <div
                                  key={doc.id}
                                  onClick={() => handleSelectDoc(doc.id)}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                    isActive 
                                      ? 'bg-brand-purple/15 border-brand-purple/35'
                                      : 'bg-white/5 border-white/5 hover:border-brand-purple/20 hover:bg-brand-purple/5'
                                  }`}
                                  id={`vault-file-${doc.id}`}
                                >
                                  <div className="flex items-start space-x-3.5 min-w-0 flex-1 pr-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 border border-brand-purple/15 flex items-center justify-center text-brand-purple shrink-0 mt-0.5">
                                      <FileText className="w-5 h-5 text-brand-purple" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center space-x-2">
                                        <div className="text-sm font-semibold text-white truncate">{doc.title}</div>
                                        {isSemanticSearch && doc.semanticScore !== undefined && (
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                                            doc.semanticScore >= 80 
                                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/10'
                                              : doc.semanticScore >= 40
                                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/10'
                                              : 'bg-gray-500/15 text-gray-400 border border-gray-500/10'
                                          }`}>
                                            {doc.semanticScore}% Match
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-3 text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wider">
                                        <span className="text-brand-cyan">{doc.type}</span>
                                        <span>•</span>
                                        <span>{doc.size}</span>
                                        <span>•</span>
                                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                      </div>
                                      {isSemanticSearch && doc.semanticReason && (
                                        <div className="text-xs text-brand-cyan/80 mt-2 italic bg-brand-cyan/5 border border-brand-cyan/10 px-2.5 py-1.5 rounded-lg">
                                          {doc.semanticReason}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2 shrink-0">
                                    {doc.automationStatus?.status === 'running' && (
                                      <span className="text-[9px] bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded font-bold uppercase animate-pulse flex items-center space-x-1.5 border border-brand-purple/10 mr-1">
                                        <RefreshCw className="w-3 h-3 animate-spin text-brand-cyan shrink-0" />
                                        <span>Automating ({doc.automationStatus.progress}%)</span>
                                      </span>
                                    )}
                                    {isActive && (
                                      <span className="text-[10px] bg-brand-cyan/25 text-brand-cyan px-2 py-0.5 rounded font-bold uppercase shrink-0">
                                        active context
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                      id={`btn-delete-${doc.id}`}
                                      title="Delete Document"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {filteredDocs.length === 0 && (
                              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                                <Files className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">No documents match search or are uploaded.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. AI Chat View */}
                {currentPage === 'chat' && (
                  activeDoc ? (
                    <ChatInterface activeDoc={activeDoc} />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}

                {/* 4. AI Summary View */}
                {currentPage === 'summary' && (
                  activeDoc ? (
                    <SummaryView 
                      activeDoc={activeDoc} 
                      onSummaryGenerated={(summaryData) => {
                        setActiveDoc(prev => prev ? { ...prev, summary: summaryData } : null);
                        fetchStats();
                      }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}

                {/* 4b. Document Annotator View */}
                {currentPage === 'viewer' && (
                  activeDoc ? (
                    <DocumentViewer activeDoc={activeDoc} />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}

                {/* 5. Quiz Generator View */}
                {currentPage === 'quiz' && (
                  activeDoc ? (
                    <QuizView 
                      activeDoc={activeDoc} 
                      onQuizCompleted={() => {
                        fetchStats();
                      }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}

                {/* 6. Profile View */}
                {currentPage === 'profile' && (
                  <div className="max-w-2xl mx-auto space-y-6" id="profile-page">
                    <GlassCard className="p-8 text-center space-y-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-purple flex items-center justify-center text-2xl font-black text-white mx-auto shadow-xl shadow-brand-purple/10">
                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'G'}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white">{userEmail ? userEmail.split('@')[0] : 'Guest User'}</h3>
                        <p className="text-xs text-gray-500 font-semibold">{userEmail || 'guest@smartdocs.ai'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-4">
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Account Tier</div>
                          <span className="text-sm font-extrabold text-brand-purple mt-0.5 inline-block">Free MVP</span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-center">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Storage Capacity</div>
                          <span className="text-sm font-extrabold text-brand-cyan mt-0.5 inline-block">{documents.length} / 25 Files</span>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Historical statistics detailed details */}
                    <GlassCard className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Activity Report</h4>
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Total PDF Uploads</span>
                          <span className="font-bold text-white">{documents.filter(d => d.type === 'pdf').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Total DOCX Uploads</span>
                          <span className="font-bold text-white">{documents.filter(d => d.type === 'docx').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>Total TXT Uploads</span>
                          <span className="font-bold text-white">{documents.filter(d => d.type === 'txt').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-300 pt-2 border-t border-white/5">
                          <span>Last Activity</span>
                          <span className="font-semibold text-brand-cyan">{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* 7. Settings View */}
                {currentPage === 'settings' && (
                  <div className="max-w-2xl mx-auto space-y-6" id="settings-page">
                    <GlassCard className="p-6 space-y-6">
                      <div className="flex items-center space-x-2.5 pb-4 border-b border-white/5">
                        <Settings className="w-5 h-5 text-brand-purple" />
                        <h3 className="text-base font-bold text-white">System Settings</h3>
                      </div>

                      {/* Display Mode */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Display Preferences</h4>
                          <p className="text-xs text-gray-400 mt-0.5">Toggle default high-contrast display presets</p>
                        </div>
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className="px-4.5 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-brand-purple/20 hover:bg-brand-purple/5 transition-all text-xs font-bold text-white active:scale-95"
                          id="btn-toggle-darkmode"
                        >
                          {darkMode ? 'Midnight Dark (Active)' : 'Light Glow'}
                        </button>
                      </div>

                      {/* Notifications Toggle */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div>
                          <h4 className="text-sm font-bold text-white">Sound and Notifications</h4>
                          <p className="text-xs text-gray-400 mt-0.5">Allow in-app alerts on file processing state</p>
                        </div>
                        <button
                          onClick={() => setNotifyState(!notifyState)}
                          className="px-4.5 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs font-bold active:scale-95"
                          id="btn-toggle-notifications"
                        >
                          {notifyState ? 'Alerts On' : 'Alerts Off'}
                        </button>
                      </div>

                      {/* Language Preset Selection */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div>
                          <h4 className="text-sm font-bold text-white">Language Presets</h4>
                          <p className="text-xs text-gray-400 mt-0.5">Default study evaluation language</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {['English', 'Spanish', 'French'].map((lang) => (
                            <button
                              key={lang}
                              onClick={() => setLanguage(lang)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                language === lang
                                  ? 'bg-brand-purple/25 text-brand-purple border border-brand-purple/20'
                                  : 'bg-white/5 text-gray-400 border border-transparent'
                              }`}
                              id={`lang-btn-${lang}`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Privacy details */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-bold text-white">
                          <Shield className="w-4 h-4 text-brand-cyan" />
                          <span>Strict Privacy Safehouse</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
                          All files processed via SmartDocs AI are securely containerized inside your instance sandbox. We strictly adhere to zero-retention guidelines for study manuals, textbooks, and reports.
                        </p>
                      </div>
                    </GlassCard>
                  </div>
                )}

                {/* Automation Center */}
                {currentPage === 'automation_center' && (
                  activeDoc ? (
                    <AutomationCenter 
                      activeDoc={activeDoc} 
                      onAutomationComplete={(updatedDoc) => {
                        setActiveDoc(updatedDoc);
                        fetchDocuments();
                        fetchStats();
                        fetchTasks();
                        fetchReminders();
                        fetchAutomationHistory();
                      }} 
                    />
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}

                {/* Task Dashboard */}
                {currentPage === 'tasks_dashboard' && (
                  <TaskDashboard 
                    tasks={tasks} 
                    reminders={reminders} 
                    onToggleTask={handleToggleTask} 
                    isLoading={isLoadingTasks} 
                  />
                )}

                {/* Multi-Document Chat */}
                {currentPage === 'multi_chat' && (
                  <MultiDocChat documents={documents} />
                )}

                {/* Email Automation */}
                {currentPage === 'email_automation' && (
                  <EmailAutomation activeDoc={activeDoc} userEmail={userEmail} />
                )}

                {/* Knowledge Graph */}
                {currentPage === 'knowledge_graph' && (
                  activeDoc ? (
                    activeDoc.knowledgeGraph ? (
                      <KnowledgeGraph graphData={activeDoc.knowledgeGraph} />
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                        <h3 className="text-sm font-bold text-white">No Knowledge Graph Available</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                          This file has not been run through the Agentic Workflow. Run automation first to generate its concept map.
                        </p>
                        <button 
                          onClick={() => setCurrentPage('automation_center')} 
                          className="mt-2 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20"
                        >
                          Open Automation Center
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-8 h-8 text-brand-purple mx-auto mb-2 animate-pulse" />
                      <p className="text-sm text-gray-300">Please select an active document first from the Library tab.</p>
                      <button onClick={() => setCurrentPage('library')} className="mt-4 px-5 py-2.5 bg-brand-purple rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-purple/20">Go to Library</button>
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      ) : (
        // Out-of-App Public Landing & Auth Pages
        <div className="z-10 relative">
          <Navbar 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
          />

          <AnimatePresence mode="wait">
            {currentPage === 'auth' ? (
              // 8. Futuristic Authentication View
              <motion.div
                key="auth"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="min-h-screen flex items-center justify-center p-6 pt-24"
                id="auth-page"
              >
                <div className="flex flex-col lg:flex-row items-center gap-10 max-w-4xl w-full">
                  {/* Left — Feature bullets (desktop only) */}
                  <div className="hidden lg:flex flex-col space-y-5 flex-1">
                    <div className="space-y-2">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-[10px] font-bold text-brand-purple uppercase tracking-widest">
                        <Sparkles className="w-3 h-3 text-brand-cyan" />
                        <span>Trusted by 50,000+ users</span>
                      </div>
                      <h3 className="text-2xl font-black text-white leading-tight">Your AI-Powered
                        <span className="block gradient-text-animated">Document Brain</span>
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed">Everything you need to understand, quiz on, and act on any document — in minutes.</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: Zap, label: 'Instant AI Summaries', desc: 'Get executive summaries in seconds' },
                        { icon: MessageSquare, label: 'Contextual AI Chat', desc: 'Ask anything about your documents' },
                        { icon: Brain, label: 'Knowledge Graphs', desc: 'Visualize concept relationships' },
                        { icon: Shield, label: 'Zero-retention Privacy', desc: 'Your data stays yours, always' },
                      ].map((feat, i) => {
                        const FIcon = feat.icon;
                        return (
                          <div key={i} className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-brand-purple/12 border border-brand-purple/20 flex items-center justify-center shrink-0">
                              <FIcon className="w-3.5 h-3.5 text-brand-purple" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">{feat.label}</div>
                              <div className="text-[10px] text-gray-500 font-medium">{feat.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right — Auth card */}
                  <GlassCard className="w-full max-w-md p-8 space-y-6 border border-brand-purple/20 relative shadow-purple-glow" id="auth-box">
                    <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-28 h-28 bg-brand-purple/12 blur-2xl rounded-full" />
                    <div className="absolute left-0 bottom-0 -translate-x-6 translate-y-6 w-20 h-20 bg-brand-cyan/8 blur-xl rounded-full" />

                    <div className="text-center space-y-2 relative">
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-purple-glow mx-auto"
                      >
                        <BookOpen className="w-7 h-7 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-black text-white">Welcome Back</h3>
                      <p className="text-xs text-gray-400">Choose your secure login path to access the Workspace</p>
                    </div>

                    <div className="space-y-3 pt-1 relative">
                      {/* Email input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" htmlFor="auth-email-input">
                          Your Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="auth-email-input"
                            type="email"
                            placeholder="you@example.com"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-purple/50 focus:bg-brand-purple/5 transition-all"
                            onKeyDown={(e) => { if (e.key === 'Enter' && userEmail.trim()) handleLogin(userEmail.trim()); }}
                          />
                        </div>
                      </div>

                      {/* Google login — uses typed email */}
                      <motion.button
                        onClick={() => {
                          const email = userEmail.trim() || 'guest@smartdocs.ai';
                          handleLogin(email);
                        }}
                        disabled={!userEmail.trim()}
                        className="w-full py-3.5 rounded-xl bg-white text-gray-900 text-sm font-bold shadow-elevation-md flex items-center justify-center space-x-3 hover:bg-gray-50 transition-all border border-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                        whileHover={userEmail.trim() ? { scale: 1.01 } : {}}
                        whileTap={userEmail.trim() ? { scale: 0.98 } : {}}
                        id="google-login-btn"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.4 3.65 1.57 7.5l3.86 3C6.34 7.54 9 5.04 12 5.04z" />
                          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.45c-.28 1.48-1.12 2.74-2.38 3.59l3.69 2.87c2.16-1.99 3.42-4.93 3.42-8.57z" />
                          <path fill="#FBBC05" d="M5.43 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.57 6.9C.57 8.9 0 11.13 0 13.5s.57 4.6 1.57 6.6l3.86-3z" />
                          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.03.69-2.35 1.1-3.96 1.1-3 0-5.66-2.5-6.57-5.46L.88 15.86C2.71 19.7 6.66 23 12 23z" />
                        </svg>
                        <span>Continue with Google</span>
                      </motion.button>

                      {/* Guest Login */}
                      <motion.button
                        onClick={() => handleLogin('guest@smartdocs.ai')}
                        className="w-full py-3.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 text-white text-sm font-semibold flex items-center justify-center space-x-3 transition-all"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        id="guest-login-btn"
                      >
                        <User className="w-4.5 h-4.5 text-brand-purple" />
                        <span>Continue as Guest</span>
                      </motion.button>
                    </div>

                    {/* Social proof */}
                    <div className="flex items-center justify-center space-x-1 pt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand-purple to-brand-cyan border-2 border-black flex items-center justify-center text-[8px] font-black text-white -ml-1 first:ml-0">
                          {['S','D','P','M','R'][i]}
                        </div>
                      ))}
                      <span className="text-[10px] text-gray-400 font-semibold ml-2">Join 12,400+ researchers</span>
                    </div>

                    <div className="text-[9px] text-gray-600 text-center leading-relaxed font-normal">
                      By accessing SmartDocs, you agree to our terms. All data is containerized in your private instance.
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            ) : (
              // 9. Premium Hero Landing View
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-24 min-h-screen"
                id="landing-page"
              >
                {/* Hero section — Enhanced */}
                <section className="px-6 py-24 text-center max-w-5xl mx-auto space-y-8 relative">
                  {/* Floating badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-brand-purple/10 border border-brand-purple/25 text-xs font-bold text-brand-purple animate-float shadow-purple-glow"
                  >
                    <Sparkles className="w-4 h-4 text-brand-cyan shrink-0 animate-pulse" />
                    <span>Next-Gen Knowledge Synthesis Vault · Powered by Gemini 2.5 Flash</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                    className="text-5xl md:text-7xl font-black text-white leading-none tracking-tighter"
                  >
                    Transform documents into
                    <br />
                    <span className="gradient-text-animated">
                      Instant Knowledge
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                  >
                    Stop drowning in multi-page PDFs, manuals, and reports. Upload your files and let Gemini synthesize premium summaries, structured quizzes, and custom AI chats instantly.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="flex flex-wrap items-center justify-center gap-4 pt-4"
                  >
                    <motion.button
                      onClick={() => setCurrentPage('auth')}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-purple to-brand-purple/80 text-sm font-bold text-white shadow-purple-glow flex items-center space-x-2.5 group"
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      id="landing-hero-cta"
                    >
                      <Zap className="w-4.5 h-4.5 text-brand-cyan" />
                      <span>Start Reading For Free</span>
                      <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                    <a
                      href="#features"
                      className="px-7 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 text-sm font-bold text-white transition-all"
                    >
                      Explore Features
                    </a>
                  </motion.div>

                  {/* Trust Stats Bar — Enhanced */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 pt-6"
                  >
                    {[
                      { icon: Users, label: '50,000+', sub: 'Active Users', color: 'text-brand-purple', bg: 'bg-brand-purple/10 border-brand-purple/20' },
                      { icon: Files, label: '2M+ Docs', sub: 'Processed', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10 border-brand-cyan/20' },
                      { icon: Zap, label: 'Gemini 2.5', sub: 'Flash Powered', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                      { icon: Shield, label: 'SOC2', sub: 'Compliant', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    ].map((stat, i) => {
                      const Icon = stat.icon;
                      return (
                        <React.Fragment key={i}>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="flex items-center space-x-2.5 text-left px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/6 hover:border-white/10 transition-all"
                          >
                            <div className={`w-8 h-8 rounded-lg ${stat.bg} border flex items-center justify-center ${stat.color} shrink-0`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className={`text-sm font-black ${stat.color}`}>{stat.label}</div>
                              <div className="text-[10px] text-gray-500 font-semibold">{stat.sub}</div>
                            </div>
                          </motion.div>
                          {i < 3 && <div className="hidden md:block w-px h-6 bg-white/8" />}
                        </React.Fragment>
                      );
                    })}
                  </motion.div>

                  {/* Product Demo Mockup */}
                  <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55, type: 'spring', stiffness: 180 }}
                    className="pt-8 max-w-4xl mx-auto w-full"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_-16px_rgba(168,85,247,0.3)]" style={{ background: 'linear-gradient(145deg, rgba(168,85,247,0.08) 0%, rgba(10,10,20,0.95) 40%, rgba(34,211,238,0.05) 100%)' }}>
                      {/* Window chrome bar */}
                      <div className="flex items-center px-4 py-3 border-b border-white/6 bg-white/[0.03]">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/60" />
                          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                          <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                        </div>
                        <div className="flex-1 flex justify-center">
                          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/8">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping-soft" />
                            <span className="text-[10px] text-gray-400 font-mono">smartdocs.ai/workspace</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <div className="px-2 py-1 rounded bg-brand-purple/20 border border-brand-purple/25">
                            <span className="text-[9px] text-brand-purple font-bold uppercase tracking-wider">LIVE</span>
                          </div>
                        </div>
                      </div>
                      {/* Demo content */}
                      <div className="grid grid-cols-5 min-h-[280px]">
                        {/* Sidebar */}
                        <div className="col-span-1 border-r border-white/5 p-3 space-y-2 bg-black/20">
                          {[{ icon: LayoutDashboard, label: 'Dashboard', active: false }, { icon: Files, label: 'Library', active: true }, { icon: MessageSquare, label: 'AI Chat', active: false }, { icon: Network, label: 'Graph', active: false }].map((item, i) => {
                            const SIcon = item.icon;
                            return (
                              <div key={i} className={`flex items-center space-x-2 px-2 py-2 rounded-lg text-[10px] font-semibold transition-all ${ item.active ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/20' : 'text-gray-500 hover:text-gray-300'}`}>
                                <SIcon className="w-3 h-3 shrink-0" />
                                <span className="hidden lg:block">{item.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Main area */}
                        <div className="col-span-4 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-white">Document Library</div>
                              <div className="text-[9px] text-gray-500 mt-0.5">3 documents • AI-processed</div>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <div className="px-2.5 py-1.5 rounded-lg bg-brand-purple text-[9px] font-bold text-white flex items-center space-x-1">
                                <Zap className="w-2.5 h-2.5 text-brand-cyan" />
                                <span>Upload</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {[{ name: 'Q3 Financial Report.pdf', type: 'PDF', status: 'Analyzed', color: 'text-brand-purple' }, { name: 'Research Paper — LLMs.docx', type: 'DOCX', status: 'Chat Ready', color: 'text-brand-cyan' }, { name: 'Contract_Draft_v2.pdf', type: 'PDF', status: 'Summarized', color: 'text-emerald-400' }].map((doc, i) => (
                              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/6 hover:border-brand-purple/20 transition-all group">
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center ${doc.color}`}>
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-semibold text-white">{doc.name}</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${doc.color}`}>{doc.type}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[8px] font-bold text-gray-400 border border-white/5">{doc.status}</span>
                                  <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-brand-purple transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* AI Chat preview strip */}
                          <div className="mt-2 p-3 rounded-xl bg-brand-purple/8 border border-brand-purple/15">
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-lg bg-brand-purple/25 flex items-center justify-center">
                                <Sparkles className="w-2.5 h-2.5 text-brand-purple animate-pulse" />
                              </div>
                              <span className="text-[9px] text-brand-purple font-semibold">AI: "The Q3 revenue grew 23% YoY, driven by SaaS subscriptions..."</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Glow behind mockup */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-dark to-transparent pointer-events-none" />
                  </motion.div>
                </section>

                {/* Features Section — 6 cards bento grid */}
                <section id="features" className="px-6 py-20 max-w-7xl mx-auto space-y-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center space-y-3"
                  >
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Cpu className="w-3 h-3" />
                      <span>Full-Stack AI Suite</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Everything You Need to Master
                      <span className="block gradient-text-purple-cyan">Any Document</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">Digest complex manuals in minutes, not hours. Powered by Gemini 2.5 Flash.</p>
                  </motion.div>

                  {/* 6-card bento grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                      {
                        title: 'Multimodal Parsing',
                        desc: 'Native Gemini compatibility extracts data patterns from PDFs, Word docs, and plain text automatically.',
                        icon: Files,
                        gradient: 'from-brand-purple/20 to-brand-purple/5',
                        border: 'border-brand-purple/20',
                        iconColor: 'text-brand-purple',
                      },
                      {
                        title: 'AI Context Chat',
                        desc: 'Semantic conversations with total document memory context, giving accurate citations without hallucination.',
                        icon: MessageSquare,
                        gradient: 'from-brand-cyan/15 to-brand-cyan/5',
                        border: 'border-brand-cyan/20',
                        iconColor: 'text-brand-cyan',
                      },
                      {
                        title: 'Quiz & Recall Engine',
                        desc: 'Generate multiple-choice exams from your uploads to test recall with detailed answer feedback.',
                        icon: HelpCircle,
                        gradient: 'from-emerald-500/15 to-emerald-500/5',
                        border: 'border-emerald-500/20',
                        iconColor: 'text-emerald-400',
                      },
                      {
                        title: 'Knowledge Graph',
                        desc: 'Visualize concept relationships as an interactive node graph mapping every idea in your document.',
                        icon: Network,
                        gradient: 'from-indigo-500/15 to-indigo-500/5',
                        border: 'border-indigo-500/20',
                        iconColor: 'text-indigo-400',
                      },
                      {
                        title: 'Email Automation',
                        desc: 'AI-drafted professional emails for offer letters, summaries, assignment answers, and contract reviews.',
                        icon: Mail,
                        gradient: 'from-amber-500/15 to-amber-500/5',
                        border: 'border-amber-500/20',
                        iconColor: 'text-amber-400',
                      },
                      {
                        title: 'Candidate Assessment',
                        desc: 'Full AI recruitment pipeline: resume analysis, custom quizzes, interview simulation, and automated decisions.',
                        icon: Users,
                        gradient: 'from-rose-500/15 to-rose-500/5',
                        border: 'border-rose-500/20',
                        iconColor: 'text-rose-400',
                      },
                    ].map((feat, idx) => {
                      const Icon = feat.icon;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.07, type: 'spring', stiffness: 250 }}
                        >
                          <GlassCard hoverEffect className={`space-y-4 h-full border ${feat.border}`} id={`feature-card-${idx}`}>
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.gradient} border ${feat.border} flex items-center justify-center ${feat.iconColor}`}>
                              <Icon className="w-5.5 h-5.5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white mb-2">{feat.title}</h4>
                              <p className="text-xs text-gray-400 leading-relaxed font-normal">{feat.desc}</p>
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* How It Works — 3-step animated process */}
                <section className="px-6 py-20 max-w-5xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center space-y-3 mb-16"
                  >
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-[10px] font-bold text-brand-cyan uppercase tracking-widest">
                      <Play className="w-3 h-3" />
                      <span>Simple 3-Step Process</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">From Upload to
                      <span className="block gradient-text-animated">Intelligence in Seconds</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">No complex setup. Just drop your document and let Gemini do the heavy lifting.</p>
                  </motion.div>

                  <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute top-10 left-[16.666%] right-[16.666%] h-px bg-gradient-to-r from-brand-purple/40 via-brand-cyan/40 to-emerald-500/40 hidden md:block" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        {
                          step: '01',
                          title: 'Upload Your Document',
                          desc: 'Drag & drop any PDF, DOCX, or TXT file. Our Gemini-powered parser instantly extracts structure, tables, and text with 99.9% fidelity.',
                          icon: FileText,
                          color: 'text-brand-purple',
                          bg: 'from-brand-purple/20 to-brand-purple/5',
                          border: 'border-brand-purple/25',
                          glow: 'shadow-purple-glow',
                        },
                        {
                          step: '02',
                          title: 'AI Analyzes & Maps',
                          desc: 'Gemini 2.5 Flash reads the full context, builds a knowledge graph, detects key entities, generates summaries, and creates quiz sets.',
                          icon: Brain,
                          color: 'text-brand-cyan',
                          bg: 'from-brand-cyan/15 to-brand-cyan/5',
                          border: 'border-brand-cyan/25',
                          glow: 'shadow-cyan-glow',
                        },
                        {
                          step: '03',
                          title: 'Chat, Quiz & Automate',
                          desc: 'Ask anything, test your knowledge, generate emails, or run full automation workflows. Extract maximum value from every document.',
                          icon: Sparkles,
                          color: 'text-emerald-400',
                          bg: 'from-emerald-500/15 to-emerald-500/5',
                          border: 'border-emerald-500/25',
                          glow: '',
                        },
                      ].map((step, idx) => {
                        const SIcon = step.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.12, type: 'spring', stiffness: 250 }}
                            className="relative flex flex-col items-center text-center group"
                          >
                            {/* Step number circle */}
                            <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.bg} border ${step.border} ${step.glow} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                              <SIcon className={`w-8 h-8 ${step.color}`} />
                              <div className={`absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-brand-dark border ${step.border} flex items-center justify-center`}>
                                <span className={`text-[9px] font-black ${step.color}`}>{step.step}</span>
                              </div>
                            </div>
                            <h3 className="text-base font-black text-white mb-2">{step.title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">{step.desc}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Testimonials Section — Enhanced with star ratings & 4 cards */}
                <section className="px-6 py-20 bg-white/[0.015] border-y border-white/5">
                  <div className="max-w-6xl mx-auto space-y-12">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="text-center space-y-3"
                    >
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Loved by Researchers
                        <span className="block gradient-text-purple-cyan">and Professionals</span>
                      </h2>
                      <p className="text-sm text-gray-400">See how SmartDocs AI transforms daily reading workflows across industries.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {testimonials.map((t, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1 }}
                        >
                          <GlassCard hoverEffect className={`p-6 space-y-4 text-left h-full bg-gradient-to-br ${t.color} border border-white/8`} id={`testimonial-${idx}`}>
                            {/* Stars */}
                            <div className="flex items-center space-x-0.5">
                              {Array.from({ length: t.stars }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              ))}
                            </div>
                            <p className="text-sm text-gray-200 leading-relaxed">"{t.quote}"</p>
                            <div className="flex items-center space-x-3 pt-1">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center text-sm font-black text-white shrink-0">
                                {t.avatar}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white">{t.name}</div>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{t.role}</div>
                              </div>
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* FAQ Section */}
                <section id="faq" className="px-6 py-20 max-w-3xl mx-auto space-y-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center space-y-3"
                  >
                    <h2 className="text-3xl font-black text-white">Frequently Asked
                      <span className="gradient-text-purple-cyan ml-2">Questions</span>
                    </h2>
                    <p className="text-sm text-gray-400">Answers to common inquiries about workspace operations.</p>
                  </motion.div>

                  <div className="space-y-3">
                    {faqs.map((f, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.08 }}
                      >
                        <GlassCard className="p-5 text-left space-y-2.5 hover:border-brand-purple/20 transition-colors" id={`faq-item-${idx}`}>
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 rounded-lg bg-brand-purple/15 border border-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                              <FaqIcon className="w-3.5 h-3.5 text-brand-purple" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white leading-snug">{f.q}</p>
                              <p className="text-xs text-gray-400 leading-relaxed mt-2 font-normal">{f.a}</p>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="px-6 py-20 max-w-6xl mx-auto space-y-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center space-y-3"
                  >
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>Simple Pricing</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Choose Your
                      <span className="block gradient-text-animated">Intelligence Level</span>
                    </h2>
                    <p className="text-sm text-gray-400 max-w-md mx-auto">Start free, scale when ready. No hidden fees.</p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {pricingTiers.map((tier, idx) => {
                      const Icon = tier.icon;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1, type: 'spring', stiffness: 250 }}
                          className="relative"
                        >
                          {tier.popular && (
                            <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan text-[10px] font-black text-white uppercase tracking-wider shadow-purple-glow">
                                ✦ Most Popular
                              </span>
                            </div>
                          )}
                          <div className={`rounded-2xl p-6 space-y-5 ${tier.bg || 'glass-panel border border-white/8'} ${tier.popular ? 'scale-105' : ''} transition-all hover:scale-[1.02] hover:shadow-elevation-lg`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-xl bg-white/8 border ${tier.borderColor} flex items-center justify-center ${tier.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className={`text-sm font-black ${tier.color}`}>{tier.name}</div>
                                <div className="text-[10px] text-gray-500 font-semibold">{tier.description}</div>
                              </div>
                            </div>
                            <div className="flex items-baseline space-x-1">
                              <span className="text-4xl font-black text-white">{tier.price}</span>
                              <span className="text-xs text-gray-500 font-medium">{tier.period}</span>
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                            <ul className="space-y-2">
                              {tier.features.map((f, fi) => (
                                <li key={fi} className="flex items-center space-x-2.5 text-xs text-gray-300">
                                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${tier.color}`} />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => setCurrentPage('auth')}
                              className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${tier.ctaStyle}`}
                            >
                              {tier.cta}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* Full-width CTA Banner */}
                <section className="px-6 pb-12 max-w-5xl mx-auto">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-3xl p-12 text-center"
                    style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(34,211,238,0.1) 50%, rgba(168,85,247,0.08) 100%)', border: '1px solid rgba(168,85,247,0.25)' }}
                  >
                    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #a855f7 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/15 blur-3xl rounded-full" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-cyan/10 blur-2xl rounded-full" />
                    <div className="relative space-y-5">
                      <div className="text-4xl">🚀</div>
                      <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Ready to Transform Your
                        <span className="block gradient-text-animated">Document Workflow?</span>
                      </h2>
                      <p className="text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
                        Join 50,000+ researchers, analysts, and professionals who use SmartDocs AI to work 10x smarter.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <motion.button
                          onClick={() => setCurrentPage('auth')}
                          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-purple to-brand-cyan text-sm font-black text-white shadow-purple-glow flex items-center space-x-2.5"
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          id="cta-banner-btn"
                        >
                          <Rocket className="w-4.5 h-4.5" />
                          <span>Start For Free — No Credit Card</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </section>

                {/* Enhanced Footer */}
                <footer className="py-16 border-t border-white/5 px-6 z-10 relative">
                  <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10">
                      {/* Brand */}
                      <div className="space-y-4 md:col-span-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-purple-glow">
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-black text-white">SmartDocs AI</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Enterprise document intelligence powered by Google Gemini 2.5 Flash.</p>
                        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">All Systems Operational</span>
                        </div>
                      </div>
                      {/* Links */}
                      {[
                        { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                        { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
                        { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Compliance'] },
                      ].map((col) => (
                        <div key={col.title} className="space-y-3">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{col.title}</div>
                          <ul className="space-y-2">
                            {col.links.map(link => (
                              <li key={link}><a href="#" className="text-xs text-gray-500 hover:text-gray-200 transition-colors">{link}</a></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                      <p className="text-[10px] text-gray-600">
                        © 2026 SmartDocs AI · Designed with absolute precision · Powered by Gemini
                      </p>
                      <div className="flex items-center space-x-4">
                        {['Privacy', 'Terms', 'Cookies'].map(l => (
                          <a key={l} href="#" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">{l}</a>
                        ))}
                      </div>
                    </div>
                  </div>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
