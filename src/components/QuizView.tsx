import React, { useState, useEffect } from 'react';
import { HelpCircle, Check, X, ArrowRight, RefreshCw, Trophy, BookOpen, Smile, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentItem, Quiz, Question, Difficulty } from '../types';
import GlassCard from './GlassCard';

interface QuizViewProps {
  activeDoc: DocumentItem;
  onQuizCompleted: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ activeDoc, onQuizCompleted }) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active playing states
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // History tracking state
  const [pastQuizzes, setPastQuizzes] = useState<Quiz[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewQuiz, setReviewQuiz] = useState<Quiz | null>(null);

  const fetchPastQuizzes = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/quizzes?documentId=${activeDoc.id}`);
      if (response.ok) {
        const data = await response.json();
        // Only keep quizzes that have been completed (score is set)
        const completed = data.filter((q: Quiz) => q.score !== undefined);
        // Sort by completion time (newest first)
        completed.sort((a: Quiz, b: Quiz) => {
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return timeB - timeA;
        });
        setPastQuizzes(completed);
      }
    } catch (err) {
      console.error('Failed to fetch past quizzes:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPastQuizzes();
    setReviewQuiz(null);
    setQuiz(null);
  }, [activeDoc.id]);

  const handleCreateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentIdx(0);
    setSelectedOpt(null);
    setHasSubmitted(false);
    setCorrectAnswersCount(0);
    setIsQuizFinished(false);

    try {
      const response = await fetch(`/api/documents/${activeDoc.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty })
      });

      if (!response.ok) {
        throw new Error('Failed to generate educational quiz. Please check backend.');
      }

      const quizData = await response.json();
      setQuiz(quizData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred while creating quiz using Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (hasSubmitted) return;
    setSelectedOpt(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOpt === null || hasSubmitted || !quiz) return;
    setHasSubmitted(true);
    
    const currentQuestion = quiz.questions[currentIdx];
    if (selectedOpt === currentQuestion.correctAnswer) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    setSelectedOpt(null);
    setHasSubmitted(false);

    if (currentIdx + 1 < quiz.questions.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!quiz) return;
    setIsQuizFinished(true);
    setIsSubmittingScore(true);

    try {
      // Save completed score to server database
      const response = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: correctAnswersCount })
      });

      if (response.ok) {
        onQuizCompleted();
        fetchPastQuizzes();
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleResetQuiz = () => {
    setQuiz(null);
    setIsQuizFinished(false);
  };

  if (reviewQuiz) {
    const scorePct = Math.round(((reviewQuiz.score || 0) / reviewQuiz.questions.length) * 100);
    return (
      <div className="space-y-6 max-w-3xl mx-auto" id="quiz-review-workspace">
        {/* Review Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                reviewQuiz.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                reviewQuiz.difficulty === 'medium' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {reviewQuiz.difficulty} Quiz
              </span>
              <span className="text-xs text-gray-500 font-bold font-mono">
                {new Date(reviewQuiz.completedAt || '').toLocaleString()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1.5 truncate max-w-md">{activeDoc.title}</h3>
          </div>
          <button
            onClick={() => setReviewQuiz(null)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all active:scale-95"
            id="btn-back-to-dashboard"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Score Card Banner */}
        <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-r from-brand-purple/10 to-brand-cyan/10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-brand-purple" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Performance Score</div>
              <div className="text-lg font-extrabold text-white">
                {reviewQuiz.score} / {reviewQuiz.questions.length} Correct ({scorePct}%)
              </div>
            </div>
          </div>
          <div className="text-sm font-semibold text-brand-cyan font-mono">
            {reviewQuiz.score === reviewQuiz.questions.length ? 'PERFECT SCORE!' : reviewQuiz.score && reviewQuiz.score >= 3 ? 'WELL DONE!' : 'ROOM TO IMPROVE'}
          </div>
        </GlassCard>

        {/* Questions list */}
        <div className="space-y-6">
          {reviewQuiz.questions.map((q, qIdx) => (
            <GlassCard key={q.id} className="p-6 space-y-4" id={`review-question-${q.id}`}>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-xs font-mono font-bold text-gray-400 shrink-0 mt-0.5">
                  {qIdx + 1}
                </span>
                <h4 className="text-base font-bold text-white leading-relaxed">{q.question}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                {q.options.map((opt, oIdx) => {
                  const isCorrect = q.correctAnswer === oIdx;
                  return (
                    <div
                      key={oIdx}
                      className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                        isCorrect
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : 'bg-white/[0.02] border-white/5 text-gray-500'
                      }`}
                    >
                      <span>{opt}</span>
                      {isCorrect && (
                        <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-green-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pl-9">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs leading-relaxed text-gray-300 space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-brand-purple">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Explanation & Reference</span>
                  </div>
                  <p className="font-normal">{q.explanation}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="quiz-workspace">
      {quiz ? (
        <AnimatePresence mode="wait">
          {!isQuizFinished ? (
            <motion.div
              key="quiz-play"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              {/* Quiz Header Progress */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-purple uppercase tracking-widest">{difficulty} Quiz</span>
                  <h4 className="text-sm font-semibold text-gray-400 mt-0.5 truncate max-w-xs">{activeDoc.title}</h4>
                </div>
                <span className="text-xs text-gray-500 font-mono font-bold">
                  Question {currentIdx + 1} of {quiz.questions.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-purple h-full transition-all duration-300"
                  style={{ width: `${((currentIdx + (hasSubmitted ? 1 : 0)) / quiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Active Question Panel */}
              <GlassCard className="space-y-6" id={`quiz-question-card-${currentIdx}`}>
                <h3 className="text-lg font-bold text-white leading-relaxed">
                  {quiz.questions[currentIdx].question}
                </h3>

                {/* Option buttons */}
                <div className="space-y-3">
                  {quiz.questions[currentIdx].options.map((opt, idx) => {
                    const isSelected = selectedOpt === idx;
                    const isCorrect = quiz.questions[currentIdx].correctAnswer === idx;
                    
                    let btnStyle = 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10';
                    if (isSelected) {
                      btnStyle = 'border-brand-purple/50 bg-brand-purple/10 text-white';
                    }
                    if (hasSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'border-green-500/50 bg-green-500/10 text-green-400';
                      } else if (isSelected) {
                        btnStyle = 'border-red-500/50 bg-red-500/10 text-red-400';
                      } else {
                        btnStyle = 'border-white/5 bg-white/5 text-gray-500 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={hasSubmitted}
                        className={`w-full text-left p-4 rounded-xl border font-medium text-sm transition-all flex items-center justify-between group active:scale-[0.99] ${btnStyle}`}
                        id={`option-${idx}`}
                      >
                        <span className="flex-1 pr-3">{opt}</span>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-brand-purple bg-brand-purple' : 'border-white/10'
                        }`}>
                          {hasSubmitted && isCorrect && <Check className="w-3.5 h-3.5 text-white" />}
                          {hasSubmitted && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-white" />}
                          {!hasSubmitted && isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Answer Submission rational details */}
                <AnimatePresence>
                  {hasSubmitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                        selectedOpt === quiz.questions[currentIdx].correctAnswer
                          ? 'bg-green-500/5 border-green-500/20 text-green-300'
                          : 'bg-red-500/5 border-red-500/20 text-red-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Explanation</span>
                      </div>
                      <p className="font-normal">{quiz.questions[currentIdx].explanation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation actions */}
                <div className="pt-2 flex justify-end">
                  {!hasSubmitted ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedOpt === null}
                      className="px-6 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-95"
                      id="btn-quiz-submit"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/85 hover:from-brand-purple hover:to-brand-purple text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 flex items-center space-x-2 active:scale-95 transition-all"
                      id="btn-quiz-next"
                    >
                      <span>
                        {currentIdx + 1 < quiz.questions.length ? 'Next Question' : 'Finish Quiz'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="quiz-result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto text-center space-y-6"
            >
              <GlassCard className="p-8 space-y-6" id="quiz-results-card">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/15 to-brand-cyan/15 flex items-center justify-center border border-brand-purple/20 mx-auto">
                  <Trophy className="w-8 h-8 text-brand-purple animate-bounce" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Quiz Completed!</h3>
                  <p className="text-xs text-gray-400">Excellent effort testing your doc comprehension</p>
                </div>

                {/* Score gauge circle placeholder */}
                <div className="py-4 relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-4 border-white/5 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-white">
                      {correctAnswersCount}
                    </span>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                      of {quiz.questions.length} Correct
                    </span>
                  </div>
                </div>

                <div className="text-sm font-medium text-gray-300">
                  {correctAnswersCount === quiz.questions.length ? (
                    <span className="text-green-400">Perfect Score! You parsed every detail flawlessly.</span>
                  ) : correctAnswersCount >= 3 ? (
                    <span className="text-brand-cyan">Well done! You have a solid comprehension grasp.</span>
                  ) : (
                    <span className="text-yellow-400">Nice attempt! Review the summary and retry to improve.</span>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex flex-col space-y-3 pt-4">
                  <button
                    onClick={handleCreateQuiz}
                    className="w-full py-3 rounded-xl bg-brand-purple text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 flex items-center justify-center space-x-2.5 border border-white/10"
                    id="btn-quiz-retry"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again (New Quiz)</span>
                  </button>
                  <button
                    onClick={handleResetQuiz}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-sm font-semibold text-gray-300"
                    id="btn-quiz-done"
                  >
                    Return to Selection
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <div className="w-full">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 border border-brand-purple/15 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-brand-purple animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Generating Evaluation...</h4>
                <p className="text-xs text-gray-400 mt-1">Gemini is structuring MCQs, answers, and rationale...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Create Quiz Card */}
              <div className="lg:col-span-2">
                <GlassCard className="p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[450px]" id="quiz-generate-card">
                  <div className="max-w-md space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-purple/10 to-brand-cyan/10 flex items-center justify-center border border-brand-purple/15 mx-auto">
                      <HelpCircle className="w-8 h-8 text-brand-purple" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-white">Test Your Knowledge</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Generate an interactive 5-question multiple choice quiz on "{activeDoc.title}" to test your conceptual recall and deep-dive comprehension.
                      </p>
                    </div>

                    {/* Difficulty selector */}
                    <div className="space-y-2.5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Select Difficulty:</div>
                      <div className="flex items-center justify-center space-x-3 p-1.5 bg-white/5 border border-white/5 rounded-xl max-w-xs mx-auto">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                          <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                              difficulty === level
                                ? 'bg-gradient-to-r from-brand-purple to-brand-purple/80 text-white shadow-md shadow-brand-purple/15'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                            id={`diff-btn-${level}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                        ⚠️ <strong>Error</strong>: {error}
                      </div>
                    )}

                    <button
                      onClick={handleCreateQuiz}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-purple/80 hover:from-brand-purple hover:to-brand-purple text-sm font-semibold text-white shadow-lg shadow-brand-purple/20 flex items-center space-x-2.5 mx-auto active:scale-95 transition-all"
                      id="btn-start-quiz"
                    >
                      <Play className="w-4 h-4 fill-white text-white shrink-0" />
                      <span>Generate Smart Quiz</span>
                    </button>
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Past Attempts List */}
              <div className="lg:col-span-1">
                <GlassCard className="p-6 h-full flex flex-col justify-between" id="quiz-history-card">
                  <div>
                    <div className="flex items-center space-x-2 pb-4 border-b border-white/5 mb-4">
                      <Trophy className="w-5 h-5 text-brand-purple" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quiz Attempts ({pastQuizzes.length})</h4>
                    </div>

                    {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <RefreshCw className="w-6 h-6 text-brand-purple animate-spin" />
                        <span className="text-xs text-gray-500">Loading history...</span>
                      </div>
                    ) : pastQuizzes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <div className="p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                          <HelpCircle className="w-8 h-8 text-neutral-700" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-400">No attempts yet</div>
                          <p className="text-[10px] text-gray-500 mt-1 max-w-[180px] mx-auto leading-relaxed">
                            Your scores will appear here as you complete comprehension evaluations.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-y-auto space-y-3 max-h-[350px] pr-1 scrollbar-thin">
                        {pastQuizzes.map((attempt) => {
                          const scorePct = Math.round(((attempt.score || 0) / attempt.questions.length) * 100);
                          return (
                            <div
                              key={attempt.id}
                              className="p-3.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-brand-purple/20 rounded-xl transition-all flex flex-col space-y-2 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest border ${
                                  attempt.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                  attempt.difficulty === 'medium' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                  'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                  {attempt.difficulty}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono font-bold">
                                  {new Date(attempt.completedAt || '').toLocaleDateString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-extrabold text-white">
                                    Score: {attempt.score} / {attempt.questions.length}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-medium">
                                    Comprehension: {scorePct}%
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReviewQuiz(attempt)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-purple/10 hover:bg-brand-purple hover:text-white border border-brand-purple/25 text-[10px] font-bold text-brand-purple transition-all active:scale-95 cursor-pointer"
                                >
                                  Review
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default QuizView;
