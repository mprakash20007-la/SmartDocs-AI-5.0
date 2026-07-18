import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, History, Check, AlertCircle, RefreshCw, FileText, 
  CheckCircle2, Shield, ChevronRight, ChevronLeft, Sparkles, Eye, 
  Edit3, Zap, ArrowRight, User, Briefcase, GraduationCap,
  FileQuestion, Receipt, Scale, FileSignature, File, Trophy, X, Link2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem, SmartEmailCategory, SmartEmailDraft, SmartEmailHistoryEntry, SmartEmailTone, SmartEmailAction, CandidateAssessment } from '../types';
import GlassCard from './GlassCard';

interface EmailAutomationProps {
  activeDoc: DocumentItem | null;
  userEmail?: string;
}

interface DetectedInfo {
  category: SmartEmailCategory;
  confidence: number;
  candidateName?: string;
  roleOrSubject?: string;
  documentDescription: string;
}

export const EmailAutomation: React.FC<EmailAutomationProps> = ({ activeDoc, userEmail }) => {
  // Common states
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [history, setHistory] = useState<SmartEmailHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Recipient configs (general/other categories)
  const [recipientEmail, setRecipientEmail] = useState(userEmail || '');
  const [recipientName, setRecipientName] = useState('');

  // AI Detection State
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);

  // Candidate Assessment Invites (recruitment workflow)
  const [assessments, setAssessments] = useState<CandidateAssessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState(userEmail || '');
  const [inviteRole, setInviteRole] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Email Decision Modal / Draft State (HR manager sends decision)
  const [activeDecisionInvite, setActiveDecisionInvite] = useState<CandidateAssessment | null>(null);
  const [decisionType, setDecisionType] = useState<'offer' | 'rejection' | null>(null);
  const [decisionSubject, setDecisionSubject] = useState('');
  const [decisionBody, setDecisionBody] = useState('');
  const [isDraftingDecision, setIsDraftingDecision] = useState(false);
  const [isSendingDecision, setIsSendingDecision] = useState(false);

  // Email Builder State (for standard categories)
  const [draft, setDraft] = useState<SmartEmailDraft | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [editableSubject, setEditableSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [tone, setTone] = useState<SmartEmailTone>('formal');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Question Bank Answer Key States
  const [isGeneratingAnswerKey, setIsGeneratingAnswerKey] = useState(false);
  const [answerKeyHtml, setAnswerKeyHtml] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (activeDoc) {
      handleAutoDetect();
    } else {
      resetAllStates();
    }
  }, [activeDoc?.id]);

  const resetAllStates = () => {
    setDetectedInfo(null);
    setAssessments([]);
    setDraft(null);
    setAnswerKeyHtml(null);
    setError(null);
    setSendSuccess(false);
    setActiveDecisionInvite(null);
    setDecisionType(null);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/smart-email/history');
      if (res.ok) setHistory(await res.json());
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAssessments = async () => {
    if (!activeDoc) return;
    setIsLoadingAssessments(true);
    try {
      const res = await fetch(`/api/smart-email/assessments?documentId=${activeDoc.id}`);
      if (res.ok) setAssessments(await res.json());
    } catch (e) {
      console.error('Failed to fetch invites', e);
    } finally {
      setIsLoadingAssessments(false);
    }
  };

  const handleAutoDetect = async () => {
    if (!activeDoc) return;
    setIsDetecting(true);
    resetAllStates();

    try {
      const res = await fetch('/api/smart-email/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: activeDoc.id })
      });
      if (!res.ok) throw new Error('Auto-detection failed');
      const data: DetectedInfo = await res.json();
      setDetectedInfo(data);
      setRecipientName(data.candidateName || 'Candidate');

      // Initialize form variables
      setInviteName(data.candidateName || '');
      setInviteRole(data.roleOrSubject || '');

      // Take immediate category-specific action
      if (data.category === 'resume') {
        fetchAssessments();
        setIsDetecting(false);
      } else if (data.category === 'question_bank') {
        generateAnswerKey();
      } else {
        generateStandardEmail(data.category);
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred during auto-detection.');
      setIsDetecting(false);
    }
  };

  // Invite Candidate Assessment
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc || !inviteName || !inviteEmail || !inviteRole) return;
    setIsInviting(true);
    setError(null);

    try {
      const res = await fetch('/api/smart-email/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDoc.id,
          candidateName: inviteName,
          candidateEmail: inviteEmail,
          role: inviteRole
        })
      });
      if (!res.ok) throw new Error('Failed to dispatch invite link.');
      
      // Reset form & reload assessments
      setInviteName('');
      setInviteRole(detectedInfo?.roleOrSubject || '');
      fetchAssessments();
      setSendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Invite dispatch failed.');
    } finally {
      setIsInviting(false);
    }
  };

  // Prepare Decision Letter Draft
  const handleDraftDecision = async (assess: CandidateAssessment, decision: 'offer' | 'rejection') => {
    setActiveDecisionInvite(assess);
    setDecisionType(decision);
    setIsDraftingDecision(true);
    setError(null);

    try {
      const res = await fetch(`/api/smart-email/assessments/${assess.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      });
      if (!res.ok) throw new Error('Failed to draft decision template.');
      fetchAssessments();
      setSendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Decision dispatch failed.');
    } finally {
      setIsDraftingDecision(false);
    }
  };

  // Recruiter Manual Overrides
  const handleOverride = async (assessId: string, action: string, decision?: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/smart-email/assessments/${assessId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, decision })
      });
      if (!res.ok) throw new Error('Override command execution failed.');
      fetchAssessments();
      alert(`Override action "${action}" executed successfully.`);
    } catch (err: any) {
      setError(err.message || 'Override error.');
    }
  };

  // Export Recruiter Logs to CSV
  const exportToCSV = () => {
    const headers = ['Candidate Name', 'Email', 'Position', 'JD Match %', 'Quiz Score', 'Interview Score', 'Status', 'Completed Date'];
    const rows = assessments.map(a => [
      a.candidateName,
      a.candidateEmail,
      a.role,
      a.analysis?.matchPercentage ? `${a.analysis.matchPercentage}%` : 'N/A',
      a.score !== undefined ? `${a.score}/10` : 'N/A',
      a.interviewMetrics?.overallScore !== undefined ? `${a.interviewMetrics.overallScore}/10` : 'N/A',
      a.finalDecision || 'pending',
      a.completedAt ? new Date(a.completedAt).toLocaleString() : 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartDocs_Recruitment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Question Bank Answer Key
  const generateAnswerKey = async () => {
    if (!activeDoc) return;
    setIsGeneratingAnswerKey(true);
    try {
      const res = await fetch('/api/smart-email/answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: activeDoc.id })
      });
      if (!res.ok) throw new Error('Failed to compile answer key');
      const data = await res.json();
      setAnswerKeyHtml(data.answerKeyHtml);
      
      // Auto build draft email with the answer key
      const draftData: SmartEmailDraft = {
        id: 'draft_' + Math.random().toString(36).substring(2, 11),
        documentId: activeDoc.id,
        category: 'question_bank',
        action: 'answer_key',
        tone: 'formal',
        recipientName: 'Student/Class',
        recipientEmail: recipientEmail,
        subject: data.subject || `Answer Key: ${activeDoc.title}`,
        htmlBody: data.answerKeyHtml,
        plainPreview: 'Compiled answer key for the test paper.',
        confidence: 0.95,
        generatedAt: new Date().toISOString()
      };
      setDraft(draftData);
      setEditableSubject(draftData.subject);
      setEditableBody(draftData.htmlBody);
    } catch (err: any) {
      setError('Could not compile answer key. Please try again.');
    } finally {
      setIsGeneratingAnswerKey(false);
      setIsDetecting(false);
    }
  };

  // Generate standard email for other categories
  const generateStandardEmail = async (cat: SmartEmailCategory, customAction?: string) => {
    if (!activeDoc) return;
    setIsGeneratingEmail(true);
    try {
      const res = await fetch('/api/smart-email/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: activeDoc.id,
          recipientName: recipientName,
          recipientEmail: recipientEmail,
          tone,
          category: cat,
          action: customAction
        })
      });
      if (!res.ok) throw new Error('Email analysis failed');
      const data: SmartEmailDraft = await res.json();
      setDraft(data);
      setEditableSubject(data.subject);
      setEditableBody(data.htmlBody);
    } catch (err: any) {
      setError('Error generating structured email draft.');
    } finally {
      setIsGeneratingEmail(false);
      setIsDetecting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!draft || !activeDoc) return;
    setIsSending(true);
    setError(null);
    setSendSuccess(false);

    try {
      const res = await fetch('/api/smart-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          recipientName: recipientName,
          subject: editableSubject,
          htmlBody: editableBody,
          documentId: draft.documentId,
          category: draft.category,
          action: draft.action,
          tone: draft.tone
        })
      });

      if (!res.ok) throw new Error('Send failed');
      setSendSuccess(true);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Error occurred while sending.');
    } finally {
      setIsSending(false);
    }
  };

  const categoryBadgeColors = (cat: SmartEmailCategory) => {
    const colors: Record<SmartEmailCategory, string> = {
      resume: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      assignment: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      question_bank: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      business_report: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      invoice: 'text-red-400 bg-red-500/10 border-red-500/20',
      legal_contract: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      cover_letter: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      general: 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="email-automation-view">
      {/* Left Workspace Panel — 2/3 */}
      <div className="lg:col-span-2 space-y-5">
        
        {/* Dynamic Scanning Mode */}
        {isDetecting && (
          <GlassCard className="py-16 text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/5 to-brand-cyan/5 animate-pulse" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-16 h-16 rounded-full border-4 border-t-brand-purple border-r-brand-cyan border-b-brand-purple/20 border-l-brand-cyan/20 mx-auto flex items-center justify-center"
            >
              <Zap className="w-6 h-6 text-brand-cyan animate-bounce" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-wide">Intelligent Document Classifier</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">Gemini is reading, parsing structure, and initializing your context-specific email dashboard...</p>
            </div>
            {/* Scanner line animation */}
            <div className="absolute left-0 right-0 top-0 h-1 bg-brand-cyan/40 shadow-[0_0_15px_#0ea5e9] animate-scanner" />
          </GlassCard>
        )}

        {/* Dynamic Categorized Workspaces */}
        {!isDetecting && detectedInfo && (
          <AnimatePresence mode="wait">
            
            {/* RESUME SCREENING CONSOLE */}
            {detectedInfo.category === 'resume' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* 1. Invite Form */}
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-brand-purple/10 blur-3xl rounded-full" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Recruitment Assessment dispatcher</h3>
                        <p className="text-xs text-gray-400">Invite candidate to take the role screening simulator quiz</p>
                      </div>
                    </div>
                    <span className="self-start sm:self-center text-[10px] font-black tracking-widest bg-brand-purple/20 border border-brand-purple/30 text-brand-purple px-2.5 py-1 rounded-full uppercase">
                      Resume Detected
                    </span>
                  </div>

                  <form onSubmit={handleSendInvite} className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 uppercase font-black">Candidate Name</label>
                        <input
                          type="text"
                          required
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/25 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 uppercase font-black">Candidate Email</label>
                        <input
                          type="email"
                          required
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="e.g. john@example.com"
                          className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/25 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 uppercase font-black">Job Position / Role</label>
                        <input
                          type="text"
                          required
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          placeholder="e.g. Frontend developer"
                          className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/25 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isInviting}
                        className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                      >
                        {isInviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        <span>Send Assessment Invitation Link</span>
                      </button>
                    </div>
                  </form>
                </GlassCard>

                {/* 2. Recruitment Funnel Visualizer */}
                {assessments.length > 0 && (
                  <GlassCard className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hiring Funnel Analytics</h4>
                      <span className="text-[10px] text-gray-500">Real-time candidate progression</span>
                    </div>

                    <div className="grid grid-cols-5 gap-3 text-center">
                      {[
                        { label: 'Screened', value: assessments.length, color: 'from-brand-purple to-purple-500/80' },
                        { label: 'Cleared Quiz', value: assessments.filter(a => a.score !== undefined && a.score >= 8).length, color: 'from-blue-500 to-cyan-400' },
                        { label: 'Interviewed', value: assessments.filter(a => a.interviewCompleted).length, color: 'from-indigo-500 to-indigo-400' },
                        { label: 'Hired', value: assessments.filter(a => a.finalDecision === 'hired').length, color: 'from-emerald-500 to-emerald-400' },
                        { label: 'Rejected', value: assessments.filter(a => a.finalDecision === 'rejected').length, color: 'from-red-500 to-red-400' }
                      ].map((step, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex flex-col justify-between">
                          <span className="text-xl font-bold text-white tracking-tight">{step.value}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">{step.label}</span>
                          <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${step.color} mt-2`} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* 3. Invites List / Decisions tracker */}
                <GlassCard className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Evaluation Matrix</h4>
                      <p className="text-[10px] text-gray-500">Complete tracking and manual supervisor override deck</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {assessments.length > 0 && (
                        <button
                          onClick={exportToCSV}
                          title="Export candidate logs as CSV"
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold transition-all flex items-center space-x-1 border border-white/5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Report</span>
                        </button>
                      )}
                      <button
                        onClick={fetchAssessments}
                        disabled={isLoadingAssessments}
                        className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAssessments ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {isLoadingAssessments ? (
                      <div className="text-center py-6 text-xs text-gray-500">Querying recruitment database...</div>
                    ) : assessments.length > 0 ? (
                      assessments.map((assess) => (
                        <div 
                          key={assess.id}
                          className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col space-y-3 hover:bg-white/3 transition-all text-xs"
                        >
                          {/* Candidate Header */}
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-white font-bold">{assess.candidateName}</span>
                              <span className="text-gray-500 text-[10px] ml-2">({assess.candidateEmail})</span>
                              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                Role: <span className="text-brand-cyan">{assess.role}</span>
                              </div>
                            </div>
                            
                            {/* Badges */}
                            <div className="flex items-center space-x-2">
                              {assess.analysis?.matchPercentage !== undefined && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-brand-purple/20 border border-brand-purple/30 text-brand-purple">
                                  JD Match: {assess.analysis.matchPercentage}%
                                </span>
                              )}
                              
                              {assess.finalDecision === 'hired' ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                                  Hired
                                </span>
                              ) : assess.finalDecision === 'rejected' ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
                                  Rejected
                                </span>
                              ) : !assess.completed ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider animate-pulse">
                                  Pending Quiz
                                </span>
                              ) : !assess.interviewCompleted ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider animate-pulse">
                                  Pending Interview
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wider">
                                  Decision Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Detail metrics list */}
                          <div className="grid grid-cols-3 gap-2.5 bg-white/2 p-2.5 rounded-lg border border-white/5 text-[10px] text-gray-400">
                            <div>
                              Quiz score: <strong className={assess.score !== undefined ? (assess.score >= 8 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}>
                                {assess.score !== undefined ? `${assess.score}/10` : 'Pending'}
                              </strong>
                            </div>
                            <div>
                              Interview Score: <strong className={assess.interviewMetrics?.overallScore !== undefined ? (assess.interviewMetrics.overallScore >= 7 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}>
                                {assess.interviewMetrics?.overallScore !== undefined ? `${assess.interviewMetrics.overallScore}/10` : (assess.interviewInvited ? 'Pending' : 'N/A')}
                              </strong>
                            </div>
                            <div>
                              Cheat Warnings: <strong className={assess.cheatAttemptsCount && assess.cheatAttemptsCount > 0 ? 'text-red-400 font-bold' : 'text-white'}>
                                {assess.cheatAttemptsCount || 0} / 3
                              </strong>
                            </div>
                          </div>

                          {/* Recruiter manual controls and Offer Letter downloads */}
                          <div className="flex flex-wrap items-center justify-between pt-1 border-t border-white/5 gap-3">
                            <div className="flex items-center space-x-2">
                              {assess.finalDecision === 'hired' && (
                                <a
                                  href={`/api/smart-email/assessments/${assess.id}/offer-letter`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] transition-all flex items-center space-x-1"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download Offer PDF</span>
                                </a>
                              )}
                            </div>

                            {/* Overrides action buttons row */}
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleOverride(assess.id, 'resend')}
                                title="Resend screening invite email"
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-[10px]"
                              >
                                📧 Resend Quiz
                              </button>
                              <button
                                onClick={() => handleOverride(assess.id, 'reopen')}
                                title="Reset quiz time & attempts (Unlock)"
                                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-[10px]"
                              >
                                🔓 Reset Quiz
                              </button>
                              
                              {assess.interviewCompleted && (
                                <button
                                  onClick={() => handleOverride(assess.id, 'rerun_interview')}
                                  title="Reset candidate's interview session"
                                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-[10px]"
                                >
                                  🎙️ Re-run Interview
                                </button>
                              )}

                              {/* Manual Evaluate Override */}
                              {(assess.finalDecision !== 'hired' && assess.finalDecision !== 'rejected') && assess.completed && (
                                <>
                                  <button
                                    onClick={() => handleOverride(assess.id, 'reevaluate', 'offer')}
                                    className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-[9px]"
                                  >
                                    Hire
                                  </button>
                                  <button
                                    onClick={() => handleOverride(assess.id, 'reevaluate', 'rejection')}
                                    className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-[9px]"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-gray-500 font-normal leading-relaxed">
                        No invitations sent yet for this candidate resume.<br/>Invite them above to evaluate quiz scores.
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* decision loading backdrop overlay */}
                {isDraftingDecision && (
                  <GlassCard className="py-8 text-center space-y-4">
                    <RefreshCw className="w-8 h-8 text-brand-purple animate-spin mx-auto" />
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">AI Director drafting structured recruitment decision email...</p>
                  </GlassCard>
                )}
              </motion.div>
            )}

            {/* QUESTION BANK ANSWER KEY CONSOLE */}
            {detectedInfo.category === 'question_bank' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-brand-cyan/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                        <FileQuestion className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Digital Answer Key Compiler</h3>
                        <p className="text-xs text-gray-400">Automatically parsed from test paper questions</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black tracking-widest bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan px-2.5 py-1 rounded-full uppercase">
                      Question Bank
                    </span>
                  </div>

                  {isGeneratingAnswerKey ? (
                    <div className="py-12 text-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-brand-cyan animate-spin mx-auto" />
                      <p className="text-xs text-gray-400">Generating detailed solutions and grading reference...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Recipient (e.g. Class, Student group)</label>
                          <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient email"
                            className="w-full bg-white/5 border border-white/5 focus:border-brand-cyan/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Email Subject</label>
                          <input
                            type="text"
                            value={editableSubject}
                            onChange={(e) => setEditableSubject(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 focus:border-brand-cyan/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white font-bold"
                          />
                        </div>
                      </div>

                      {/* Rendered HTML solutions */}
                      <div className="rounded-xl border border-white/10 bg-[#0d0d1a] overflow-hidden">
                        <div className="bg-white/3 border-b border-white/5 px-4 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Grading Reference & Solutions Output
                        </div>
                        {isEditingBody ? (
                          <textarea
                            value={editableBody}
                            onChange={(e) => setEditableBody(e.target.value)}
                            onBlur={() => setIsEditingBody(false)}
                            rows={12}
                            className="w-full bg-[#0d0d1a] text-gray-300 text-xs px-5 py-4 focus:outline-none resize-y border-none"
                          />
                        ) : (
                          <div 
                            className="px-5 py-4 text-xs text-gray-300 leading-relaxed max-h-[350px] overflow-y-auto cursor-text hover:bg-white/[0.01] [&_h3]:text-white [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_strong]:text-white [&_strong]:font-bold"
                            onClick={() => setIsEditingBody(true)}
                            dangerouslySetInnerHTML={{ __html: editableBody }}
                          />
                        )}
                      </div>

                      <div className="flex justify-end pt-2 space-x-3">
                        <a
                          href={`/api/smart-email/documents/${activeDoc.id}/answer-key-pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 flex items-center space-x-1.5 border border-white/5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Answer Key PDF</span>
                        </a>
                        <button
                          onClick={handleSendEmail}
                          disabled={isSending}
                          className="px-6 py-2.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/95 text-slate-900 font-extrabold text-xs shadow-lg shadow-brand-cyan/20 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                        >
                          {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>Dispatch compiled solutions email</span>
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* OTHER DOCUMENT CATEGORIES */}
            {detectedInfo.category !== 'resume' && detectedInfo.category !== 'question_bank' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-brand-purple/10 blur-3xl rounded-full" />
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Dynamic Document Correspondent</h3>
                        <p className="text-xs text-gray-400">{detectedInfo.documentDescription}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black tracking-widest border px-2.5 py-1 rounded-full uppercase ${categoryBadgeColors(detectedInfo.category)}`}>
                      {detectedInfo.category.replace('_', ' ')}
                    </span>
                  </div>

                  {isGeneratingEmail ? (
                    <div className="py-12 text-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-brand-purple animate-spin mx-auto" />
                      <p className="text-xs text-gray-400">Composing contextual correspondence...</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Recipient Name</label>
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Name"
                            className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Recipient Email</label>
                          <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Email"
                            className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 uppercase font-black">Tone</label>
                          <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value as SmartEmailTone)}
                            className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/20 focus:outline-none rounded-xl px-3 py-2 text-xs text-gray-300"
                          >
                            <option value="formal">Formal</option>
                            <option value="friendly">Friendly</option>
                            <option value="strict">Strict</option>
                          </select>
                        </div>
                      </div>

                      {/* Custom instructions */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 uppercase font-black">Custom Instructions (Optional)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={additionalInstructions}
                            onChange={(e) => setAdditionalInstructions(e.target.value)}
                            placeholder="e.g. Include invoice terms or next steps..."
                            className="flex-1 bg-white/5 border border-white/5 focus:border-brand-purple/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white"
                          />
                          <button
                            onClick={() => generateStandardEmail(detectedInfo.category)}
                            className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                          >
                            Tweak & Re-Draft
                          </button>
                        </div>
                      </div>

                      {/* Subject and Email body */}
                      {draft && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-black">Subject Line</label>
                            <input
                              type="text"
                              value={editableSubject}
                              onChange={(e) => setEditableSubject(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 focus:border-brand-purple/20 focus:outline-none rounded-xl px-4 py-2 text-xs text-white font-bold"
                            />
                          </div>

                          <div className="rounded-xl border border-white/10 bg-[#0d0d1a] overflow-hidden">
                            <div className="bg-white/3 border-b border-white/5 px-4 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Draft Output
                            </div>
                            {isEditingBody ? (
                              <textarea
                                value={editableBody}
                                onChange={(e) => setEditableBody(e.target.value)}
                                onBlur={() => setIsEditingBody(false)}
                                rows={10}
                                className="w-full bg-[#0d0d1a] text-gray-300 text-xs px-5 py-4 focus:outline-none resize-y border-none"
                              />
                            ) : (
                              <div 
                                className="px-5 py-4 text-xs text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto cursor-text hover:bg-white/[0.01] [&_h3]:text-white [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_strong]:text-white [&_strong]:font-bold"
                                onClick={() => setIsEditingBody(true)}
                                dangerouslySetInnerHTML={{ __html: editableBody }}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleSendEmail}
                          disabled={isSending}
                          className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                        >
                          {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>Dispatch correspondence email</span>
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
            
          </AnimatePresence>
        )}

        {/* Global Success Screen */}
        <AnimatePresence>
          {sendSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <GlassCard className="text-center max-w-md w-full p-8 space-y-6 relative overflow-hidden border-emerald-500/20">
                <div className="absolute inset-0 bg-emerald-500/3" />
                <button 
                  onClick={() => setSendSuccess(false)}
                  className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Action Completed!</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Recruitment transaction dispatched successfully. Status metrics updated in candidate screening records.
                  </p>
                </div>
                <button
                  onClick={() => setSendSuccess(false)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all w-full cursor-pointer"
                >
                  Return to Workspace
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar — History & Delivery Engine Details */}
      <div className="space-y-5">
        <GlassCard className="h-full space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-brand-purple" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Dispatch Log</h4>
            </div>
            <button
              onClick={fetchHistory}
              disabled={isLoadingHistory}
              className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {isLoadingHistory ? (
              <div className="text-center py-12 text-xs text-gray-500">Loading history...</div>
            ) : history.length > 0 ? (
              history.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-white/3 border border-white/5 text-[11px] space-y-2 hover:bg-white/5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-white font-bold block truncate" title={log.recipientEmail}>
                        To: {log.recipientName || log.recipientEmail.split('@')[0]}
                      </span>
                      <span className="text-gray-500 text-[10px] block truncate">{log.recipientEmail}</span>
                    </div>
                    <span className={`shrink-0 font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded border ${
                      log.status === 'success'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="text-gray-400 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                    <span className="truncate" title={log.subject}>{log.subject}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase pt-1.5 border-t border-white/3">
                    <span className="text-brand-purple">{log.category}</span>
                    <span>{new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-gray-500 leading-relaxed font-normal">
                No emails dispatched yet.<br/>Perform a screening assessment or compile answer sheets.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="p-3 rounded-xl bg-white/3 border border-white/5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Enterprise SMTP Shield</span>
              </div>
              <p className="text-[9px] text-gray-500 leading-normal font-normal">
                Delivery routing is secured using container TLS configurations. Data payload parsing is dynamic and strictly ephemeral.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default EmailAutomation;
