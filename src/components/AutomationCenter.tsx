import React, { useState, useEffect } from 'react';
import { 
  Play, Sparkles, Check, FileText, Calendar, Users, List, 
  HelpCircle, BookOpen, Layers, ShieldAlert, Award, 
  Download, RefreshCw, Layers as FlashcardIcon, Network,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem, AutomationReport } from '../types';
import GlassCard from './GlassCard';
import { exportToMarkdown, exportToDOCX, exportToPDF } from './ExportUtilities';

interface AutomationCenterProps {
  activeDoc: DocumentItem;
  onAutomationComplete: (updatedDoc: DocumentItem) => void;
}

export const AutomationCenter: React.FC<AutomationCenterProps> = ({
  activeDoc,
  onAutomationComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [report, setReport] = useState<AutomationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'study_plan' | 'flashcards' | 'qa' | 'mindmap' | 'insights'>('overview');
  const [flippedCard, setFlippedCard] = useState<number | null>(null);

  // Smooth animation timeline interpolation states
  const [animatedStep, setAnimatedStep] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const pollIntervalRef = React.useRef<any>(null);

  const startPolling = (docId: string) => {
    setIsRunning(true);
    setError(null);

    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/documents/${docId}/automation-status`);
        if (!statusRes.ok) {
          throw new Error('Failed to fetch automation status');
        }
        const statusData = await statusRes.json();

        if (statusData.status === 'running') {
          setCurrentStep(Math.max(0, statusData.currentStep - 1));
        } else if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          const docRes = await fetch(`/api/documents/${docId}`);
          if (docRes.ok) {
            const updatedDoc = await docRes.json();
            setReport(updatedDoc.automationReport || null);
            setIsRunning(false);
            onAutomationComplete(updatedDoc);
          } else {
            throw new Error('Failed to fetch updated document details');
          }
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          setError(statusData.error || 'Agentic workflow failed.');
          setIsRunning(false);
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        setError(err.message || 'Error occurred during status polling.');
        setIsRunning(false);
      }
    }, 2000);

    return pollInterval;
  };

  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeDoc.automationReport) {
      setReport(activeDoc.automationReport);
      setIsRunning(false);
    } else {
      setReport(null);
      if (activeDoc.automationStatus?.status === 'running') {
        setCurrentStep(Math.max(0, (activeDoc.automationStatus.currentStep || 1) - 1));
        pollIntervalRef.current = startPolling(activeDoc.id);
      } else {
        setIsRunning(false);
      }
    }
    setError(null);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeDoc.id, activeDoc.automationReport, activeDoc.automationStatus]);

  // Smooth animation loops to synchronize 16 timeline checks sequentially
  useEffect(() => {
    if (!isRunning) {
      setAnimatedStep(0);
      setAnimatedProgress(0);
      return;
    }

    // Determine target percentage based on server's currentStep
    // Monotonically increase progress to prevent getting stuck on intermediate steps
    const targetProgress = Math.min(100, Math.max(10, Math.round(10 + currentStep * 6.5)));

    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev < targetProgress) {
          const next = prev + 1;
          const stepIndex = Math.min(15, Math.floor((next / 100) * 16));
          setAnimatedStep(stepIndex);
          return next;
        }
        return prev;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [isRunning, currentStep]);

  const steps = [
    'Reading document',
    'Understanding content',
    'Detecting document type',
    'Extracting key information',
    'Generating executive summary',
    'Generating detailed summary',
    'Creating flashcards',
    'Creating quiz',
    'Building study notes',
    'Building study plan',
    'Building knowledge graph',
    'Creating mind map',
    'Detecting deadlines',
    'Detecting action items',
    'Preparing final automation report',
    'Completed'
  ];

  const handleRunAutomation = async () => {
    setError(null);
    setIsRunning(true);
    setCurrentStep(0);

    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/automate`, {
        method: 'POST'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to trigger document automation');
      }

      pollIntervalRef.current = startPolling(activeDoc.id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while starting automation.');
      setIsRunning(false);
    }
  };

  const handleExport = (format: 'pdf' | 'docx' | 'md') => {
    if (!report) return;
    
    const docTitle = activeDoc.title;
    const filename = `${docTitle.split('.')[0]}_automation_report`;

    let content = `# Automation Report: ${docTitle}\n\n`;
    content += `## Executive Summary\n${report.executiveSummary}\n\n`;
    content += `## Detailed Summary\n${report.detailedSummary}\n\n`;
    
    content += `## Key Points\n`;
    report.keyPoints.forEach(p => { content += `- ${p}\n`; });
    content += `\n`;

    content += `## Action Items\n`;
    report.actionItems.forEach(item => { content += `- ${item}\n`; });
    content += `\n`;

    content += `## Study Notes\n${report.studyNotes}\n\n`;
    content += `## Revision Notes\n${report.revisionNotes}\n\n`;
    content += `## Cheat Sheet\n${report.cheatSheet}\n\n`;

    if (format === 'md') {
      exportToMarkdown(filename, content);
    } else if (format === 'docx') {
      exportToDOCX(filename, `Automation Report - ${docTitle}`, content);
    } else {
      exportToPDF(filename, `Automation Report - ${docTitle}`, content);
    }
  };

  return (
    <div className="space-y-6" id="automation-workspace">
      {/* Run Automation Wizard Banner */}
      {!report && !isRunning && (
        <GlassCard className="text-center py-16 space-y-6 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 flex items-center justify-center border border-brand-purple/15 mx-auto animate-float">
            <Sparkles className="w-8 h-8 text-brand-purple animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Document Automation Hub</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              Launch the complete agentic pipeline. In a single click, the AI will classify your document, extract tasks/reminders, compile summaries, and build custom study notes, flashcards, mind maps, and insights.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left max-w-sm mx-auto">
              ⚠️ <strong>Error</strong>: {error}
            </div>
          )}

          <button
            onClick={handleRunAutomation}
            className="px-8 py-3.5 rounded-xl bg-brand-purple hover:bg-brand-purple/95 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 flex items-center space-x-2.5 mx-auto active:scale-95 transition-all cursor-pointer"
            id="btn-run-automation"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RUN AI AUTOMATION</span>
          </button>
        </GlassCard>
      )}

      {/* Stepper Loader when Running */}
      {isRunning && (
        <GlassCard className="max-w-md mx-auto p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-brand-cyan animate-spin" />
              <span>Executing Agentic Workflow</span>
            </h3>
            <span className="text-[10px] text-brand-purple font-bold">
              {animatedProgress}% Complete
            </span>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {steps.map((step, idx) => {
              const isDone = idx < animatedStep;
              const isCurrent = idx === animatedStep;

              return (
                <div 
                  key={idx}
                  className={`flex items-center space-x-3 text-xs transition-opacity duration-300 ${
                    isDone ? 'text-green-400 font-medium' : isCurrent ? 'text-brand-cyan font-bold' : 'text-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                    isDone 
                      ? 'bg-green-500/20 border-green-500 text-green-400' 
                      : isCurrent 
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan animate-pulse font-extrabold'
                      : 'border-white/5 bg-white/5 text-gray-500'
                  }`}>
                    {isDone ? <Check className="w-3 h-3" /> : <span>{idx + 1}</span>}
                  </div>
                  <span className="truncate">{step}</span>
                </div>
              );
            })}
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-brand-cyan to-brand-purple h-full transition-all duration-300"
              style={{ width: `${animatedProgress}%` }}
            />
          </div>
        </GlassCard>
      )}

      {/* Renders Report Output */}
      {report && !isRunning && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 rounded-2xl border border-white/5 bg-white/5">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] px-2.5 py-1 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-md font-bold uppercase tracking-wider shrink-0">
                {report.documentType}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{activeDoc.title}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  AI automation completed on {new Date(report.createdAt).toLocaleDateString()} • {report.readingTime} min read
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button 
                onClick={() => handleExport('pdf')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand-purple/10 border border-white/5 text-xs text-white font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-brand-purple" />
                <span>PDF</span>
              </button>
              <button 
                onClick={() => handleExport('docx')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand-purple/10 border border-white/5 text-xs text-white font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Word</span>
              </button>
              <button 
                onClick={() => handleExport('md')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand-purple/10 border border-white/5 text-xs text-white font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <span>Markdown</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto">
            {[
              { id: 'overview', label: 'Report Overview', icon: FileText },
              { id: 'notes', label: 'Study Guides', icon: BookOpen },
              { id: 'study_plan', label: 'Study Planner', icon: Calendar },
              { id: 'flashcards', label: 'Flashcards', icon: FlashcardIcon },
              { id: 'qa', label: 'Q&A Sets', icon: HelpCircle },
              { id: 'mindmap', label: 'Mind Map', icon: Network },
              { id: 'insights', label: 'Insights', icon: Award }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
                    isActive 
                      ? 'bg-brand-purple text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="min-h-[400px]">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <GlassCard className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Difficulty</div>
                      <div className="text-lg font-black text-white capitalize">{report.difficultyLevel}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                      <Award className="w-5 h-5" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Reading Time</div>
                      <div className="text-lg font-black text-white">{report.readingTime} Mins</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
                      <FileText className="w-5 h-5" />
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Document Type</div>
                      <div className="text-lg font-black text-white truncate max-w-[150px]">{report.documentType}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                      <Layers className="w-5 h-5" />
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Executive Summary</h4>
                  <p className="text-sm text-gray-300 leading-relaxed font-normal">{report.executiveSummary}</p>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Detailed Summarization</h4>
                    <p className="text-xs text-gray-300 leading-relaxed font-normal">{report.detailedSummary}</p>
                  </GlassCard>
                  
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Key Core Points</h4>
                    <ul className="space-y-2">
                      {report.keyPoints.map((pt, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Dates */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">Dates & Events</h4>
                    <div className="space-y-2.5">
                      {report.importantDates.length === 0 ? (
                        <p className="text-xs text-gray-500">No dates detected.</p>
                      ) : report.importantDates.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-start space-x-2">
                          <Calendar className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-white">{item.date}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Names */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-brand-purple uppercase tracking-wider">Key Organizations/People</h4>
                    <div className="flex flex-wrap gap-2">
                      {report.importantNames.length === 0 ? (
                        <p className="text-xs text-gray-500">No names detected.</p>
                      ) : report.importantNames.map((name, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-white flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                          <span>{name}</span>
                        </span>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Numbers */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Key Metrics/Numbers</h4>
                    <div className="space-y-2">
                      {report.importantNumbers.length === 0 ? (
                        <p className="text-xs text-gray-500">No numbers detected.</p>
                      ) : report.importantNumbers.map((num, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300">
                          <strong className="text-white block font-bold">{num.number}</strong>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{num.description}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="space-y-4 bg-brand-purple/5 border-brand-purple/10">
                  <h4 className="text-sm font-bold text-brand-purple uppercase tracking-wider flex items-center space-x-1.5">
                    <BookOpen className="w-4.5 h-4.5" />
                    <span>Study Companion Notes</span>
                  </h4>
                  <div className="text-xs text-gray-300 leading-relaxed max-h-[500px] overflow-y-auto pr-1 whitespace-pre-line">
                    {report.studyNotes}
                  </div>
                </GlassCard>

                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-brand-cyan uppercase tracking-wider flex items-center space-x-1.5">
                    <RefreshCw className="w-4.5 h-4.5" />
                    <span>Revision Manual</span>
                  </h4>
                  <div className="text-xs text-gray-300 leading-relaxed max-h-[500px] overflow-y-auto pr-1 whitespace-pre-line">
                    {report.revisionNotes}
                  </div>
                </GlassCard>

                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-4.5 h-4.5" />
                    <span>Cheat Sheet Outline</span>
                  </h4>
                  <div className="text-xs text-gray-300 leading-relaxed max-h-[500px] overflow-y-auto pr-1 whitespace-pre-line">
                    {report.cheatSheet}
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'study_plan' && activeDoc.studyPlan && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 7 Day Plan */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-brand-cyan uppercase tracking-wider">7-Day Study Sprint</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {activeDoc.studyPlan.sevenDayPlan.map((plan, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300">
                          <strong className="text-white block font-bold">Day {idx + 1}</strong>
                          <span className="block mt-0.5">{plan}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* 15 Day Plan */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-brand-purple uppercase tracking-wider">15-Day Midterm Plan</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {activeDoc.studyPlan.fifteenDayPlan.map((plan, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300">
                          <strong className="text-white block font-bold">Milestone {idx + 1}</strong>
                          <span className="block mt-0.5">{plan}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* 30 Day Plan */}
                  <GlassCard className="space-y-3">
                    <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">30-Day Comprehensive Run</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {activeDoc.studyPlan.thirtyDayPlan.map((plan, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300">
                          <strong className="text-white block font-bold">Phase {idx + 1}</strong>
                          <span className="block mt-0.5">{plan}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                <GlassCard className="space-y-3 max-w-xl mx-auto">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Daily Goal Focuses</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {activeDoc.studyPlan.dailyGoals.map((goal, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-white/5 text-xs text-gray-300 flex items-start space-x-2">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span>{goal}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {report.flashcards.map((card, idx) => {
                    const isFlipped = flippedCard === idx;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setFlippedCard(isFlipped ? null : idx)}
                        className="h-44 w-full cursor-pointer relative perspective-1000"
                      >
                        <div className={`w-full h-full duration-500 preserve-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                          {/* Front */}
                          <div className="absolute inset-0 backface-hidden glass-panel rounded-2xl border border-white/5 bg-gradient-to-tr from-brand-purple/5 to-white/5 flex flex-col items-center justify-center p-6 text-center text-white">
                            <span className="text-[10px] text-brand-purple uppercase tracking-widest font-extrabold mb-3">Front Side</span>
                            <p className="text-sm font-bold">{card.front}</p>
                          </div>
                          
                          {/* Back */}
                          <div className="absolute inset-0 backface-hidden rotate-y-180 glass-panel rounded-2xl border border-brand-cyan/20 bg-gradient-to-tr from-brand-cyan/10 to-brand-cyan/5 flex flex-col items-center justify-center p-6 text-center text-white">
                            <span className="text-[10px] text-brand-cyan uppercase tracking-widest font-extrabold mb-3">Back Reveal</span>
                            <p className="text-xs font-semibold text-gray-200">{card.back}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* FAQs */}
                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <HelpCircle className="w-4.5 h-4.5 text-brand-purple" />
                    <span>Frequently Asked Questions</span>
                  </h4>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {report.faqs.map((faq, idx) => (
                      <div key={idx} className="space-y-1.5 p-3.5 bg-white/5 border border-white/5 rounded-xl">
                        <strong className="text-xs font-extrabold text-white block">Q: {faq.question}</strong>
                        <span className="text-xs text-gray-300 block">A: {faq.answer}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Substantive Qs */}
                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <FileText className="w-4.5 h-4.5 text-brand-cyan" />
                    <span>Extended Evaluation Questions</span>
                  </h4>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    <div className="text-xs text-brand-cyan font-bold uppercase tracking-wider">Short Response Qs</div>
                    {report.shortQuestions.map((q, idx) => (
                      <div key={idx} className="space-y-1.5 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <strong className="text-xs font-bold text-white block">{idx + 1}. {q.question}</strong>
                        <span className="text-xs text-gray-400 block italic">Sample Answer: {q.sampleAnswer}</span>
                      </div>
                    ))}

                    <div className="text-xs text-brand-purple font-bold uppercase tracking-wider pt-2">Long Essay Qs</div>
                    {report.longQuestions.map((q, idx) => (
                      <div key={idx} className="space-y-1.5 p-3 bg-white/5 border border-white/5 rounded-xl">
                        <strong className="text-xs font-bold text-white block">{idx + 1}. {q.question}</strong>
                        <span className="text-xs text-gray-400 block italic">Sample Outline: {q.sampleAnswer}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'mindmap' && (
              <div className="space-y-4">
                <GlassCard className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Concept Relationships Mindmap</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Drag to pan, scroll to zoom, click main topics to expand or collapse child definitions.</p>
                    </div>
                    <span className="text-[10px] bg-brand-cyan/20 border border-brand-cyan/25 text-brand-cyan px-2 py-0.5 rounded font-bold uppercase tracking-wider">Interactive SVG Canvas</span>
                  </div>

                  <InteractiveMindMap
                    title={activeDoc.title}
                    topics={report.relatedTopics}
                    definitions={report.definitions}
                  />
                </GlassCard>
              </div>
            )}

            {activeTab === 'insights' && activeDoc.insights && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Document Quality Metrics</h4>
                  <div className="space-y-4">
                    {/* Complexity */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                        <span>Structural Complexity</span>
                        <span className="font-bold text-white">{activeDoc.insights.complexity}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div 
                          className="bg-brand-purple h-full rounded-full"
                          style={{ width: activeDoc.insights.complexity.toLowerCase() === 'high' ? '85%' : activeDoc.insights.complexity.toLowerCase() === 'medium' ? '55%' : '25%' }}
                        />
                      </div>
                    </div>

                    {/* Coverage */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                        <span>Core Knowledge Coverage</span>
                        <span className="font-bold text-white">{activeDoc.insights.knowledgeCoverage}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div 
                          className="bg-brand-cyan h-full rounded-full"
                          style={{ width: `${activeDoc.insights.knowledgeCoverage}%` }}
                        />
                      </div>
                    </div>

                    {/* Risk */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                        <span>Risk/Compliance Level</span>
                        <span className={`font-bold ${activeDoc.insights.riskLevel === 'High' ? 'text-red-400' : 'text-green-400'}`}>{activeDoc.insights.riskLevel}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div 
                          className={`h-full rounded-full ${activeDoc.insights.riskLevel === 'High' ? 'bg-red-500' : activeDoc.insights.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: activeDoc.insights.riskLevel === 'High' ? '85%' : activeDoc.insights.riskLevel === 'Medium' ? '50%' : '15%' }}
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Thematic Topic Distribution</h4>
                  <div className="space-y-3">
                    {activeDoc.insights.topicDistribution.map((topicItem, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>{topicItem.topic}</span>
                          <span className="font-bold text-white">{topicItem.percentage}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div 
                            className="bg-brand-cyan h-full rounded-full"
                            style={{ width: `${topicItem.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="space-y-3">
                  <h4 className="text-sm font-bold text-brand-purple uppercase tracking-wider flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>Important Core Concepts</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeDoc.insights.importantConcepts.map((concept, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-white">
                        {concept}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="space-y-3">
                  <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Missing Information / Logical Gaps</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {activeDoc.insights.missingInformation.map((gap, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InteractiveMindMap: React.FC<{
  title: string;
  topics: string[];
  definitions: { term: string; definition: string }[];
}> = ({ title, topics, definitions }) => {
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 380, y: 220 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [collapsedTopics, setCollapsedTopics] = useState<Record<number, boolean>>({});
  const [activeInfo, setActiveInfo] = useState<{ title: string; desc: string } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleTopic = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedTopics(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const mainTopics = (topics || []).slice(0, 4).map((topic, idx) => {
    const radius = 160;
    const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    const angle = angles[idx];
    return {
      id: `topic_${idx}`,
      label: topic,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle,
      idx
    };
  });

  const subtopics = mainTopics.flatMap((parent) => {
    if (collapsedTopics[parent.idx]) return [];
    const subList = (definitions || []).slice(parent.idx * 2, parent.idx * 2 + 2);
    return subList.map((def, subIdx) => {
      const parentAngle = parent.angle;
      const spreadAngle = 0.38;
      const angle = parentAngle + (subIdx === 0 ? -spreadAngle : spreadAngle);
      const radius = 300;
      return {
        id: `sub_${parent.idx}_${subIdx}`,
        parentId: parent.id,
        parentX: parent.x,
        parentY: parent.y,
        label: def.term,
        definition: def.definition,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  });

  return (
    <div className="relative border border-white/5 bg-black/40 rounded-2xl overflow-hidden h-[450px]">
      <div className="absolute left-4 top-4 z-10 flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setZoom(0.85); setPan({ x: 380, y: 220 }); }}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all text-[10px] font-bold uppercase tracking-wider cursor-pointer"
          title="Recenter"
        >
          Reset
        </button>
      </div>

      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {subtopics.map((sub, i) => (
            <path
              key={`sub-path-${i}`}
              d={`M ${sub.parentX} ${sub.parentY} C ${(sub.parentX + sub.x) / 2} ${sub.parentY}, ${(sub.parentX + sub.x) / 2} ${sub.y}, ${sub.x} ${sub.y}`}
              fill="none"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          ))}

          {mainTopics.map((topic, i) => (
            <path
              key={`main-path-${i}`}
              d={`M 0 0 C ${topic.x / 2} 0, ${topic.x / 2} ${topic.y}, ${topic.x} ${topic.y}`}
              fill="none"
              stroke="rgba(168, 85, 247, 0.35)"
              strokeWidth="2.5"
            />
          ))}

          {subtopics.map((sub, i) => (
            <g
              key={`sub-node-${i}`}
              transform={`translate(${sub.x}, ${sub.y})`}
              className="cursor-pointer"
              onClick={() => setActiveInfo({ title: sub.label, desc: sub.definition })}
            >
              <rect
                x="-70"
                y="-18"
                width="140"
                height="36"
                rx="8"
                fill="rgba(15, 23, 42, 0.85)"
                stroke="rgba(34, 211, 238, 0.3)"
                strokeWidth="1"
              />
              <text
                textAnchor="middle"
                dy="4"
                fill="#cbd5e1"
                fontSize="9.5"
                fontWeight="600"
                className="pointer-events-none"
              >
                {sub.label.length > 18 ? `${sub.label.substring(0, 16)}...` : sub.label}
              </text>
            </g>
          ))}

          {mainTopics.map((topic, i) => {
            const isCollapsed = collapsedTopics[topic.idx] === true;
            return (
              <g
                key={`main-node-${i}`}
                transform={`translate(${topic.x}, ${topic.y})`}
                className="cursor-pointer"
                onClick={(e) => toggleTopic(topic.idx, e)}
              >
                <rect
                  x="-85"
                  y="-22"
                  width="170"
                  height="44"
                  rx="10"
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="rgba(168, 85, 247, 0.5)"
                  strokeWidth="1.5"
                />
                <text
                  textAnchor="middle"
                  dy="-2"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="800"
                  className="pointer-events-none"
                >
                  {topic.label.length > 20 ? `${topic.label.substring(0, 18)}...` : topic.label}
                </text>
                <g transform="translate(0, 14)">
                  <circle r="6" fill="#1e1b4b" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="1" />
                  <text
                    textAnchor="middle"
                    dy="3.2"
                    fill="#c084fc"
                    fontSize="9.5"
                    fontWeight="black"
                    className="pointer-events-none"
                  >
                    {isCollapsed ? '+' : '-'}
                  </text>
                </g>
              </g>
            );
          })}

          <g>
            <rect
              x="-100"
              y="-28"
              width="200"
              height="56"
              rx="12"
              fill="rgba(147, 51, 234, 0.25)"
              stroke="#a855f7"
              strokeWidth="2.5"
              className="backdrop-blur-md"
            />
            <text
              textAnchor="middle"
              dy="5"
              fill="#ffffff"
              fontSize="11"
              fontWeight="900"
              className="pointer-events-none uppercase tracking-wider"
            >
              {title.length > 22 ? `${title.substring(0, 19)}...` : title}
            </text>
          </g>
        </g>
      </svg>

      {activeInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 left-4 md:left-auto md:w-80 bg-slate-950/95 border border-brand-cyan/20 p-4 rounded-xl shadow-xl backdrop-blur-md z-20 space-y-2"
        >
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-black text-brand-cyan uppercase tracking-wider">{activeInfo.title}</h5>
            <button
              onClick={() => setActiveInfo(null)}
              className="text-[10px] text-gray-500 hover:text-white uppercase font-bold"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed font-normal">
            {activeInfo.desc}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AutomationCenter;
