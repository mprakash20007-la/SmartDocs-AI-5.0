import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Mic, MicOff, MessageSquare, Volume2, ChevronRight, CheckCircle2, Play, Sparkles, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from './GlassCard';

interface CandidateInterviewProps {
  assessId: string;
}

interface AssessmentData {
  id: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  completed: boolean;
}

export const CandidateInterview: React.FC<CandidateInterviewProps> = ({ assessId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssessmentData | null>(null);
  
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState('');
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalDecision, setFinalDecision] = useState<'hired' | 'rejected' | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchAssessment();
  }, [assessId]);

  const fetchAssessment = async () => {
    try {
      const res = await fetch(`/api/smart-email/assessments/${assessId}`);
      if (!res.ok) throw new Error('Assessment session not found.');
      const dataVal = await res.json();
      setData(dataVal);

      // Fetch interview questions
      const qRes = await fetch(`/api/smart-email/assessments/${assessId}/interview-questions`);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load interview panel.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let resultText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          resultText += event.results[i][0].transcript;
        }
        setAnswerText(resultText);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeakQuestion = () => {
    if (questions.length === 0 || isSpeaking) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(questions[currentIdx]);
    
    // Find natural voice
    const voices = window.speechSynthesis.getVoices();
    const selectVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))) || voices[0];
    if (selectVoice) utterance.voice = selectVoice;
    
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition API is not supported on this browser. Please type your answers manually.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleNext = () => {
    if (!answerText.trim()) return;
    
    const newAnswers = [...answers, answerText.trim()];
    setAnswers(newAnswers);
    setAnswerText('');
    
    // Stop recording/speaking
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      // Auto read the next question after a brief pause
      setTimeout(() => {
        const nextQ = questions[currentIdx + 1];
        if (nextQ) {
          const nextUtterance = new SpeechSynthesisUtterance(nextQ);
          window.speechSynthesis.speak(nextUtterance);
        }
      }, 500);
    } else {
      submitInterview(newAnswers);
    }
  };

  const submitInterview = async (finalAnswers: string[]) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/smart-email/assessments/${assessId}/interview-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers })
      });
      if (!res.ok) throw new Error('Interview submission failed.');
      const result = await res.json();
      setFinalDecision(result.finalDecision);
      setMetrics(result.metrics);
      setFinished(true);
    } catch (err: any) {
      setError(err.message || 'Error compiling your final grading.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
        <div className="text-center space-y-4">
          <RefreshCw className="w-10 h-10 text-brand-purple animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading AI Interview Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
        <GlassCard className="max-w-md text-center p-8 border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error Occurred</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">{error || 'Session invalid.'}</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full z-10">
        <AnimatePresence mode="wait">
          
          {/* Welcome/Overview Screen */}
          {!started && !finished && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8 text-center space-y-6 border-brand-purple/20">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-widest border border-brand-purple/10">
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
                  <span>Final Interview Phase</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">AI Voice & Text Interview</h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Welcome <strong className="text-white">{data.candidateName}</strong>. You have successfully cleared the initial screening for <strong>{data.role}</strong> and are invited to complete the final evaluation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/3 border border-white/5 text-[11px] text-left text-gray-400 space-y-2">
                  <p>🎙️ <strong>Interaction:</strong> AI reads 5 questions. You can speak or type your answers.</p>
                  <p>📊 <strong>Assessment:</strong> Evaluates Technical Accuracy, Problem Solving, Communication, and Confidence.</p>
                  <p>✉️ <strong>Result:</strong> Passing the final threshold auto-generates your Official Offer Letter.</p>
                </div>

                <button
                  onClick={() => {
                    setStarted(true);
                    // Read first question automatically
                    setTimeout(handleSpeakQuestion, 400);
                  }}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Begin AI Interview</span>
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* Active Interview Panel */}
          {started && !finished && (
            <motion.div
              key="active-interview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <GlassCard className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/5 pb-3">
                  <span>Question {currentIdx + 1} of {questions.length}</span>
                  <span className="text-brand-cyan font-bold tracking-wider uppercase flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-ping mr-1" />
                    Live Interview Session
                  </span>
                </div>

                {/* AI Speaker Card */}
                <div className="p-5 rounded-xl border border-brand-purple/20 bg-brand-purple/5 relative overflow-hidden flex items-start space-x-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isSpeaking ? 'bg-brand-purple text-white animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <strong className="text-[10px] text-brand-purple uppercase tracking-wider font-black">AI Recruitment Assistant</strong>
                    <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      {questions[currentIdx]}
                    </p>
                  </div>

                  <button
                    onClick={handleSpeakQuestion}
                    title="Repeat question audio"
                    className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Speech recognition waves */}
                {isListening && (
                  <div className="flex justify-center items-center space-x-1.5 py-2">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-brand-cyan rounded-full"
                        animate={{ height: [8, 32, 8] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.5 + i * 0.08,
                          ease: 'easeInOut'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Candidate Response Area */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400 uppercase font-black">Your Response</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleToggleListening}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                          isListening
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-3.5 h-3.5 animate-pulse" />
                            <span>Stop Mic</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Use Voice (STT)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Speak using your mic or type your response detailed here..."
                    className="w-full h-32 bg-white/5 border border-white/5 focus:border-brand-purple/25 focus:outline-none rounded-xl px-4 py-3 text-xs text-white resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={!answerText.trim() || submitting}
                    className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-extrabold text-xs shadow-lg shadow-brand-purple/20 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>GRADING interview answers...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentIdx < questions.length - 1 ? 'Submit Response' : 'Complete Interview'}</span>
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
              <GlassCard className="p-8 text-center space-y-6 relative overflow-hidden border-brand-cyan/20">
                {finalDecision === 'hired' ? (
                  <>
                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none animate-pulse" />
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/25 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Interview Successful!</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Congratulations! The recruitment engine has evaluated your performance.
                      </p>
                    </div>

                    {metrics && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-left text-gray-300 max-w-sm mx-auto bg-white/2 p-4 rounded-xl border border-white/5">
                        <div>🌟 Accuracy: {metrics.accuracy}/10</div>
                        <div>💬 Communication: {metrics.communication}/10</div>
                        <div>🧠 Problem Solving: {metrics.problemSolving}/10</div>
                        <div>⚡ Confidence: {metrics.confidence}/10</div>
                        <div className="col-span-2 text-center border-t border-white/5 pt-2 mt-1 text-emerald-400 font-bold">
                          Overall Fit Score: {metrics.overallScore}/10 (Hired!)
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 max-w-sm mx-auto leading-relaxed">
                      <strong>🎉 Official Offer Letter Dispatched!</strong><br />
                      A formal Job Offer PDF has been drafted and sent directly to your inbox. You may check your email to complete onboarding.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-red-500/3 pointer-events-none" />
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/25 flex items-center justify-center mx-auto animate-pulse">
                      <X className="w-8 h-8 text-red-400" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Interview Completed</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        We have completed your final technical interview grading.
                      </p>
                    </div>

                    {metrics && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-left text-gray-300 max-w-sm mx-auto bg-white/2 p-4 rounded-xl border border-white/5">
                        <div>Accuracy: {metrics.accuracy}/10</div>
                        <div>Communication: {metrics.communication}/10</div>
                        <div>Problem Solving: {metrics.problemSolving}/10</div>
                        <div className="col-span-2 text-center border-t border-white/5 pt-2 mt-1 text-red-400 font-bold">
                          Overall Fit Score: {metrics.overallScore}/10 (Below threshold 7/10)
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 max-w-sm mx-auto leading-relaxed">
                      Thank you for your time. A detailed decision email containing constructive feedback has been sent to your address.
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
