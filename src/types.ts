export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-3)
  explanation: string;
}

export interface Quiz {
  id: string;
  documentId: string;
  difficulty: Difficulty;
  questions: Question[];
  score?: number;
  completedAt?: string;
}

export interface DocumentSummary {
  executiveSummary: string;
  bulletPoints: string[];
  keyInsights: string[];
  actionItems: string[];
}

export interface Annotation {
  id: string;
  type: 'highlight' | 'note';
  text?: string; // Highlighting text content
  color: string; // Color name or hex
  page: number; // Page number
  noteText?: string; // Text content of the sticky note
  x?: number; // X position percentage (0-100)
  y?: number; // Y position percentage (0-100)
  startIndex?: number; // Start character index of highlight
  endIndex?: number; // End character index of highlight
  createdAt: string;
}

export interface DocumentPage {
  pageNumber: number;
  title: string;
  content: string;
}

export type DocumentCategory =
  | 'Academic'
  | 'Business'
  | 'Finance'
  | 'Medical'
  | 'Legal'
  | 'Technical'
  | 'Research'
  | 'Personal';

export interface ImportantDate {
  date: string;
  description: string;
}

export interface ImportantNumber {
  number: string;
  description: string;
}

export interface Definition {
  term: string;
  definition: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface ShortQuestion {
  question: string;
  sampleAnswer: string;
}

export interface LongQuestion {
  question: string;
  sampleAnswer: string;
}

export interface AutomationReport {
  id: string;
  documentId: string;
  documentType: string;
  readingTime: number; // estimated minutes
  difficultyLevel: Difficulty;
  executiveSummary: string;
  detailedSummary: string;
  keyPoints: string[];
  importantDates: ImportantDate[];
  importantNames: string[];
  importantNumbers: ImportantNumber[];
  definitions: Definition[];
  actionItems: string[];
  faqs: { question: string; answer: string }[];
  flashcards: Flashcard[];
  multipleChoiceQuestions: Question[];
  shortQuestions: ShortQuestion[];
  longQuestions: LongQuestion[];
  studyNotes: string; // Markdown formatted
  revisionNotes: string; // Markdown formatted
  cheatSheet: string; // Markdown formatted
  mindMap: string; // Mermaid syntax graph representation
  relatedTopics: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  documentId: string;
  documentTitle: string;
  title: string;
  type: 'deadline' | 'meeting' | 'assignment' | 'submission' | 'event' | 'action_item';
  date?: string;
  completed: boolean;
  assignee?: string;
}

export interface Reminder {
  id: string;
  documentId: string;
  documentTitle: string;
  title: string;
  type: 'exam' | 'deadline' | 'meeting' | 'submission' | 'interview' | 'event';
  date: string;
  status: 'pending' | 'triggered';
}

export interface StudyPlan {
  documentId: string;
  sevenDayPlan: string[];
  fifteenDayPlan: string[];
  thirtyDayPlan: string[];
  dailyGoals: string[];
  estimatedHours: number;
  difficultyLevel: string;
  completionPercentage: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'concept' | 'definition' | 'technology' | 'person';
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AutomationHistoryEntry {
  id: string;
  documentId: string;
  documentTitle: string;
  date: string;
  actionsPerformed: string[];
  executionTimeMs: number;
  status: 'success' | 'failed';
}

export interface DocumentItem {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'txt';
  size: string;
  uploadedAt: string;
  content: string; // Extracted text content
  summary?: DocumentSummary;
  annotations?: Annotation[];
  pages?: DocumentPage[];
  semanticScore?: number;
  semanticReason?: string;
  category?: DocumentCategory;
  folder?: string;
  embedding?: number[];
  automationReport?: AutomationReport;
  studyPlan?: StudyPlan;
  knowledgeGraph?: KnowledgeGraphData;
  insights?: {
    complexity: string;
    readingTime: number;
    topicDistribution: { topic: string; percentage: number }[];
    knowledgeCoverage: number;
    importantConcepts: string[];
    riskLevel: 'Low' | 'Medium' | 'High';
    missingInformation: string[];
  };
  automationStatus?: {
    status: 'idle' | 'running' | 'completed' | 'failed';
    currentStep: number;
    progress: number;
    error?: string;
  };
  candidateProfile?: CandidateProfile;
  answerKeyQuestions?: {
    question: string;
    answer: string;
    explanation: string;
  }[];
  answerKeySubject?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  documentId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  isMultiDoc?: boolean;
  selectedDocIds?: string[];
}

export interface UserStats {
  totalDocuments: number;
  totalChats: number;
  totalQuizzes: number;
  totalQuestionsAnswered: number;
  averageScore: number;
  streak?: number;
  weeklyActivity?: number[];
  monthlyActivity?: number[];
  knowledgeScore?: number;
}

export type PageId =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'library'
  | 'chat'
  | 'summary'
  | 'quiz'
  | 'viewer'
  | 'profile'
  | 'settings'
  | 'automation_center'
  | 'tasks_dashboard'
  | 'knowledge_graph'
  | 'multi_chat'
  | 'email_automation';

export interface EmailLogEntry {
  id: string;
  documentId: string;
  documentTitle: string;
  recipient: string;
  subject: string;
  type: 'summary' | 'quiz' | 'study_notes' | 'full_report';
  dispatchedAt: string;
  status: 'success' | 'failed';
  previewUrl?: string;
}

export interface EmailConfig {
  autoSendOnUpload: boolean;
  defaultRecipient: string;
  includeFlashcards: boolean;
  includeQuiz: boolean;
}

// ─── Smart Business Email Automation Types ───

export type SmartEmailCategory =
  | 'resume'
  | 'assignment'
  | 'question_bank'
  | 'business_report'
  | 'invoice'
  | 'legal_contract'
  | 'cover_letter'
  | 'general';

export type SmartEmailTone = 'formal' | 'friendly' | 'strict';

export type SmartEmailAction =
  | 'offer_letter'
  | 'rejection_letter'
  | 'assignment_answers'
  | 'answer_key'
  | 'executive_summary'
  | 'payment_reminder'
  | 'contract_review'
  | 'acknowledgment'
  | 'general_response';

export interface SmartEmailDraft {
  id: string;
  documentId: string;
  category: SmartEmailCategory;
  action: SmartEmailAction;
  tone: SmartEmailTone;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  plainPreview: string;
  confidence: number;
  generatedAt: string;
}

export interface SmartEmailHistoryEntry {
  id: string;
  documentId: string;
  documentTitle: string;
  category: SmartEmailCategory;
  action: SmartEmailAction;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  tone: SmartEmailTone;
  sentAt: string;
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface SmartEmailTemplate {
  category: SmartEmailCategory;
  actions: {
    action: SmartEmailAction;
    label: string;
    description: string;
  }[];
  icon: string;
  color: string;
  label: string;
  description: string;
}

export interface CandidateQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  education: string;
  projects: string;
  certifications: string;
}

export interface ResumeAnalysis {
  matchPercentage: number;
  skillGap: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  overallScore: number;
}

export interface CandidateAssessment {
  id: string;
  documentId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  jobDescription?: string;
  questions: CandidateQuizQuestion[];
  score?: number; // Quiz score out of 10
  completed?: boolean;
  completedAt?: string;
  decisionSent?: 'offer' | 'rejection' | null;
  candidateSkills?: string;

  // Recruitment Workflow Fields
  profile?: CandidateProfile;
  analysis?: ResumeAnalysis;
  cheatAttemptsCount?: number;
  timeRemaining?: number;
  quizEvaluation?: {
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string;
  };

  // Interview Phase
  interviewInvited?: boolean;
  interviewCompleted?: boolean;
  interviewCompletedAt?: string;
  interviewQuestions?: string[];
  interviewAnswers?: string[];
  interviewMetrics?: {
    confidence: number;
    communication: number;
    accuracy: number;
    problemSolving: number;
    behavior: number;
    professionalism: number;
    grammar: number;
    overallScore: number;
  };

  // Final Decision State
  finalDecision?: 'hired' | 'rejected' | 'pending';
  offerLetterUrl?: string;
  rejectionFeedback?: string;
}

