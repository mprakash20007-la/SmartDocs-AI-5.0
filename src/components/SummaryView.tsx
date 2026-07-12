import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, ChevronRight, RefreshCw, Sparkles, BookOpen, Key, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { DocumentItem, DocumentSummary } from '../types';
import GlassCard from './GlassCard';

interface SummaryViewProps {
  activeDoc: DocumentItem;
  onSummaryGenerated: (summary: DocumentSummary) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ activeDoc, onSummaryGenerated }) => {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the active doc already has a summary, use it
    if (activeDoc.summary) {
      setSummary(activeDoc.summary);
    } else {
      setSummary(null);
    }
    setError(null);
  }, [activeDoc.id, activeDoc.summary]);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${activeDoc.id}/summarize`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate document summary. Please verify server state.');
      }

      const summaryData = await response.json();
      setSummary(summaryData);
      onSummaryGenerated(summaryData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while communicating with Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6" id="summary-workspace">
      {summary ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Executive Summary Hero */}
          <motion.div variants={itemVariants}>
            <GlassCard className="border border-brand-purple/20 relative overflow-hidden bg-gradient-to-br from-brand-purple/5 to-transparent">
              <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-36 h-36 bg-brand-purple/10 blur-3xl rounded-full" />
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/15 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Executive Summary</h3>
                  <p className="text-gray-300 text-sm leading-relaxed font-normal">
                    {summary.executiveSummary}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Key Insights & Bullet Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Takeaways */}
            <motion.div variants={itemVariants}>
              <GlassCard className="h-full space-y-4">
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="w-5 h-5 text-brand-purple" />
                  <h4 className="text-base font-bold text-white">Core Details</h4>
                </div>
                <div className="space-y-3">
                  {summary.bulletPoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-brand-purple mt-0.5 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            {/* Key Insights */}
            <motion.div variants={itemVariants}>
              <GlassCard className="h-full space-y-4">
                <div className="flex items-center space-x-2.5">
                  <Key className="w-5 h-5 text-brand-cyan" />
                  <h4 className="text-base font-bold text-white">Critical Insights</h4>
                </div>
                <div className="space-y-3">
                  {summary.keyInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start space-x-3 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan mt-2 shrink-0" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Action Items list */}
          <motion.div variants={itemVariants}>
            <GlassCard className="space-y-4">
              <div className="flex items-center space-x-2.5">
                <CheckSquare className="w-5 h-5 text-green-400" />
                <h4 className="text-base font-bold text-white">Actionable Next Steps</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.actionItems.map((action, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-3 p-3.5 rounded-xl bg-white/5 border border-white/5 text-sm text-gray-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
          {isLoading ? (
            <div className="space-y-4 flex flex-col items-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 border border-brand-purple/15 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Generating Knowledge Graph...</h4>
                <p className="text-xs text-gray-400 mt-1">Gemini is compiling executive summaries, action steps, and key findings...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-md space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 flex items-center justify-center border border-brand-purple/15 mx-auto">
                <FileText className="w-8 h-8 text-brand-purple" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Summarize "{activeDoc.title}"</h4>
                <p className="text-xs text-gray-400">
                  Click the button below to have Google Gemini synthesize a high-value summary containing key findings, core bullet metrics, actionable takeaways, and profound insights.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                  ⚠️ <strong>Error</strong>: {error}
                </div>
              )}

              <button
                onClick={handleGenerateSummary}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple hover:to-brand-purple text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 flex items-center space-x-2.5 mx-auto active:scale-95 transition-all"
                id="btn-generate-summary"
              >
                <Sparkles className="w-4 h-4 text-brand-cyan" />
                <span>Generate Instant Summary</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SummaryView;
