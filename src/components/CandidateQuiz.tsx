import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Check, Send, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from './GlassCard';

interface CandidateQuizProps {
  assessId: string;
  onTransitionToInterview?: () => void;
}

interface Question {
  question: string;
  options: string[];
}

interface AssessmentData {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  completed: boolean;
  score?: number;
  questions: Question[];
  timeRemaining?: number;
  cheatAttemptsCount?: number;
}

export const CandidateQuiz: React.FC<CandidateQuizProps> = ({ assessId, onTransitionToInterview }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssessmentData & { decisionSent?: 'offer' | 'rejection' | null; candidateSkills?: string } | null>(null);
  const [showSkillsStep, setShowSkillsStep] = useState(false);
  const [skills, setSkills] = useState('');
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [decision, setDecision] = useState<'offer' | 'rejection' | null>(null);

  // Anti-Cheat & Timer state
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes (600s)
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs for tracking values inside intervals/events
  const answersRef = useRef<number[]>([]);
  const skillsRef = useRef<string>('');
  const cheatRef = useRef<number>(0);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    skillsRef.current = skills;
  }, [skills]);

  useEffect(() => {
    cheatRef.current = cheatAttempts;
  }, [cheatAttempts]);

  useEffect(() => {
    fetchAssessment();
  }, [assessId]);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`/api/smart-email/assessments/${assessId}`);
      if (!res.ok) {
        throw new Error('Assessment not found or expired.');
      }
      const dataVal = await res.json();
      setData(dataVal);
      if (dataVal.completed) {
        setFinished(true);
        setFinalScore(dataVal.score ?? null);
        setDecision(dataVal.decisionSent ?? null);
      } else {
        setTimeRemaining(dataVal.timeRemaining !== undefined ? dataVal.timeRemaining : 600);
        setCheatAttempts(dataVal.cheatAttemptsCount !== undefined ? dataVal.cheatAttemptsCount : 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment.');
    } finally {
      setLoading(false);
    }
  };

  // Fullscreen, tab focus, and copy-paste listeners
  useEffect(() => {
    if (!started || finished) return;

    // 1. Fullscreen change listener
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        handleCheatAttempt('Exited fullscreen mode');
      }
    };

    // 2. Window/Tab blur (visibility change) listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheatAttempt('Switched tabs or unfocused assessment window');
      }
    };

    // 3. Block copy-paste and text selection
    const blockCopyPaste = (e: Event) => {
      e.preventDefault();
      alert('Copying, pasting, selecting text, and context menus are locked during this evaluation.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', blockCopyPaste);
    document.addEventListener('paste', blockCopyPaste);
    document.addEventListener('selectstart', blockCopyPaste);
    document.addEventListener('contextmenu', blockCopyPaste);

    // Initial fullscreen check
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', blockCopyPaste);
      document.removeEventListener('paste', blockCopyPaste);
      document.removeEventListener('selectstart', blockCopyPaste);
      document.removeEventListener('contextmenu', blockCopyPaste);
    };
  }, [started, finished]);

  // 4. Timer ticker with auto-saving to database every 15s
  useEffect(() => {
    if (!started || finished) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          alert('Time limit reached. Submitting your answers automatically.');
          submitAssessment(answersRef.current, skillsRef.current, cheatRef.current);
          return 0;
        }

        // Sync with database every 15 seconds
        if (next % 15 === 0) {
          fetch(`/api/smart-email/assessments/${assessId}/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeRemaining: next, cheatAttemptsCount: cheatRef.current })
          }).catch(err => console.error('Failed to sync timer telemetry', err));
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, finished]);

  const handleCheatAttempt = async (reason: string) => {
    const nextCheatCount = cheatRef.current + 1;
    setCheatAttempts(nextCheatCount);

    // Sync telemetry immediately
    fetch(`/api/smart-email/assessments/${assessId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cheatAttemptsCount: nextCheatCount })
    }).catch(err => console.error('Failed to sync cheat telemetry', err));

    if (nextCheatCount >= 3) {
      alert(`Anti-Cheat threshold exceeded: ${reason}. Your assessment has been submitted automatically.`);
      submitAssessment(answersRef.current, skillsRef.current, nextCheatCount);
    } else {
      alert(`WARNING (${nextCheatCount}/3): Anti-Cheat violation detected. Details: ${reason}. Remaining in fullscreen is mandatory.`);
    }
  };

  const handleBeginQuiz = async () => {
    if (!skills.trim()) return;
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setStarted(true);
      setShowSkillsStep(false);
    } catch (err) {
      alert('Fullscreen access is mandatory to begin this test. Please try again.');
    }
  };

  const handleNext = () => {
    if (selectedOpt === null) return;
    const newAnswers = [...answers, selectedOpt];
    setAnswers(newAnswers);
    setSelectedOpt(null);

    if (currentIdx < (data?.questions.length ?? 0) - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submitAssessment(newAnswers, skills, cheatAttempts);
    }
  };

  const submitAssessment = async (finalAnswers: number[], skillsText: string, finalCheatsCount: number) => {
    setSubmitting(true);
    // Exit fullscreen on submit
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const res = await fetch(`/api/smart-email/assessments/${assessId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answers: finalAnswers, 
          candidateSkills: skillsText,
          cheatAttemptsCount: finalCheatsCount
        })
      });
      if (!res.ok) throw new Error('Failed to submit assessment.');
      const result = await res.json();
      setFinalScore(result.score);
      setDecision(result.passed ? 'offer' : 'rejection'); // Map client finished status templates
      setFinished(true);
    } catch (err: any) {
      setError(err.message || 'Submission error.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-brand-purple animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading your candidate portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
        <GlassCard className="max-w-md text-center p-8 border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Access Denied</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            {error || 'This assessment session is invalid, expired, or has already been completed.'}
          </p>
        </GlassCard>
      </div>
    );
  }

  // Fullscreen gate overlay
  if (!isFullscreen && started && !finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6 z-50 fixed inset-0">
        <GlassCard className="max-w-md text-center p-8 border-yellow-500/20">
          <ShieldAlert className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-2">Fullscreen Required</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            This evaluation enforces a strict lock-down environment. You must remain in fullscreen mode to prevent cheat actions.
          </p>
          <button
            onClick={() => {
              document.documentElement.requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => alert('Failed to restore fullscreen.'));
            }}
            className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all"
          >
            Re-enter Fullscreen Mode
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-lg w-full z-10">
        <AnimatePresence mode="wait">
          
          {/* Welcome Screen */}
          {!started && !showSkillsStep && !finished && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8 text-center space-y-6 border-brand-purple/20">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-widest border border-brand-purple/10">
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
                  <span>Interactive Screening</span>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Candidate Suitability Portal</h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Hello <strong className="text-white">{data.candidateName}</strong>! You have been invited to complete a screening assessment for the position of <strong>{data.role}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/3 border border-white/5 text-[11px] text-left text-gray-400 space-y-2">
                  <p>🔹 <strong>Format:</strong> 10 role-specific scenario-based questions.</p>
                  <p>🔹 <strong>Time Limit:</strong> 10 minutes (Time auto-saves and submits on expiry).</p>
                  <p>🔹 <strong>Anti-Cheat:</strong> Exiting fullscreen or switching tabs yields warnings and auto-submission.</p>
                </div>

                <button
                  onClick={() => setShowSkillsStep(true)}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Start Role Assessment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* Skills Collection Screen */}
          {showSkillsStep && !started && !finished && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8 space-y-6 border-brand-purple/20">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-white">Key Skills & Experience</h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Please outline your core technical skills, frameworks, and programming languages to help evaluate your application.
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] text-gray-400 uppercase font-black">Your Skills / Technologies</label>
                  <textarea
                    required
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. JavaScript, React, Node.js, Python, SQL, System Architecture"
                    className="w-full h-28 bg-white/5 border border-white/5 focus:border-brand-purple/25 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white resize-none"
                  />
                </div>

                <button
                  onClick={handleBeginQuiz}
                  disabled={!skills.trim()}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>Begin Scenario Quiz (Launches Fullscreen)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* Active Quiz Screen */}
          {started && !finished && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/5 pb-3">
                  <span>Question {currentIdx + 1} of {data.questions.length}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${timeRemaining < 60 ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}>
                      ⏱️ {formatTime(timeRemaining)}
                    </span>
                    <span className="text-brand-purple font-bold tracking-wider uppercase">Evaluation</span>
                  </div>
                </div>

                {cheatAttempts > 0 && (
                  <div className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: {cheatAttempts}/3 cheat events registered. Exit fullscreen or switch tabs to trigger auto-submit.</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                      {data.questions[currentIdx].question}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {data.questions[currentIdx].options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedOpt(idx)}
                        className={`p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          selectedOpt === idx
                            ? 'border-brand-purple/40 bg-brand-purple/10 text-white font-bold'
                            : 'border-white/5 bg-white/3 hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        <span>{option}</span>
                        {selectedOpt === idx && (
                          <div className="w-4 h-4 rounded-full bg-brand-purple/20 border border-brand-purple flex items-center justify-center shrink-0 ml-2">
                            <Check className="w-2.5 h-2.5 text-brand-purple" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={selectedOpt === null || submitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>EVALUATING answers...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentIdx < data.questions.length - 1 ? 'Next Question' : 'Complete assessment'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Finished Screen */}
          {finished && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlassCard className="p-8 text-center space-y-6 relative overflow-hidden">
                {decision === 'offer' ? (
                  <>
                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none animate-pulse" />
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center mx-auto">
                      <Trophy className="w-8 h-8 text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Excellent work <strong className="text-white">{data.candidateName}</strong>! You scored <strong className="text-emerald-400">{finalScore ?? data.score} / {data.questions.length}</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 max-w-sm mx-auto leading-relaxed">
                      <strong>🎉 Screening Threshold Cleared!</strong><br />
                      You have passed the suitability test (Score &gt;= 8/10). We have sent an email with the link to the next step: the <strong>AI Voice/Text Interview Portal</strong>. Please check your inbox at: <strong>{data.candidateEmail}</strong>.
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (onTransitionToInterview) {
                          onTransitionToInterview();
                        } else {
                          window.location.search = `?assessId=${assessId}&phase=interview`;
                        }
                      }}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
                      <span>Start Professional AI Interview Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </>
                ) : decision === 'rejection' ? (
                  <>
                    <div className="absolute inset-0 bg-red-500/3 pointer-events-none" />
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/25 flex items-center justify-center mx-auto">
                      <X className="w-8 h-8 text-red-400" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Assessment Completed</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Thank you <strong className="text-white">{data.candidateName}</strong>. You scored <strong className="text-red-400">{finalScore ?? data.score} / {data.questions.length}</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 max-w-sm mx-auto leading-relaxed">
                      We appreciate you taking the time to complete the evaluation. A formal decision follow-up and review email with detailed constructive feedback has been sent to <strong>{data.candidateEmail}</strong>.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-green-500/3 pointer-events-none" />
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/25 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Quiz Evaluation Completed!</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Thank you <strong className="text-white">{data.candidateName}</strong>. Your scenario assessment responses for the <strong>{data.role}</strong> position have been recorded.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white/3 border border-white/5 text-[11px] text-gray-400 max-w-sm mx-auto">
                      Your responses are saved. Check your email at: <strong>{data.candidateEmail}</strong> for the next steps in our recruitment process.
                    </div>
                  </>
                )}
              </GlassCard>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
