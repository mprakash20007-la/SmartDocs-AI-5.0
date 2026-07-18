import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/smartdocs-ai';

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const documentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  type: String,
  size: String,
  uploadedAt: String,
  content: String,
  summary: mongoose.Schema.Types.Mixed,
  annotations: [mongoose.Schema.Types.Mixed],
  pages: [mongoose.Schema.Types.Mixed],
  semanticScore: Number,
  semanticReason: String,
  category: String,
  folder: String,
  embedding: [Number],
  automationReport: mongoose.Schema.Types.Mixed,
  studyPlan: mongoose.Schema.Types.Mixed,
  knowledgeGraph: mongoose.Schema.Types.Mixed,
  insights: mongoose.Schema.Types.Mixed,
  automationStatus: mongoose.Schema.Types.Mixed,
  candidateProfile: mongoose.Schema.Types.Mixed,
  answerKeyQuestions: [mongoose.Schema.Types.Mixed],
  answerKeySubject: String
}, { strict: false });

const chatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  title: String,
  messages: [mongoose.Schema.Types.Mixed],
  createdAt: String,
  isMultiDoc: Boolean,
  selectedDocIds: [String]
}, { strict: false });

const quizSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  difficulty: String,
  questions: [mongoose.Schema.Types.Mixed],
  score: Number,
  completedAt: String
}, { strict: false });

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  documentTitle: String,
  title: String,
  type: String,
  date: String,
  completed: Boolean,
  assignee: String
}, { strict: false });

const reminderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  documentTitle: String,
  title: String,
  type: String,
  date: String,
  status: String
}, { strict: false });

const automationHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  documentTitle: String,
  date: String,
  actionsPerformed: [String],
  executionTimeMs: Number,
  status: String
}, { strict: false });

const emailHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  documentTitle: String,
  recipient: String,
  subject: String,
  type: String,
  dispatchedAt: String,
  status: String,
  previewUrl: String
}, { strict: false });

const smartEmailHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  documentTitle: String,
  category: String,
  action: String,
  recipientName: String,
  recipientEmail: String,
  subject: String,
  tone: String,
  sentAt: String,
  status: String,
  errorMessage: String
}, { strict: false });

const candidateAssessmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  documentId: String,
  candidateName: String,
  candidateEmail: String,
  role: String,
  jobDescription: String,
  questions: [mongoose.Schema.Types.Mixed],
  score: Number,
  completed: Boolean,
  completedAt: String,
  decisionSent: String,
  candidateSkills: String,
  profile: mongoose.Schema.Types.Mixed,
  analysis: mongoose.Schema.Types.Mixed,
  cheatAttemptsCount: Number,
  timeRemaining: Number,
  quizEvaluation: mongoose.Schema.Types.Mixed,
  interviewInvited: Boolean,
  interviewCompleted: Boolean,
  interviewCompletedAt: String,
  interviewQuestions: [String],
  interviewAnswers: [String],
  interviewMetrics: mongoose.Schema.Types.Mixed,
  finalDecision: String,
  offerLetterUrl: String,
  rejectionFeedback: String
}, { strict: false });

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  emailConfig: mongoose.Schema.Types.Mixed
}, { strict: false });

export const DocumentModel = mongoose.model('Document', documentSchema);
export const ChatModel = mongoose.model('Chat', chatSchema);
export const QuizModel = mongoose.model('Quiz', quizSchema);
export const TaskModel = mongoose.model('Task', taskSchema);
export const ReminderModel = mongoose.model('Reminder', reminderSchema);
export const AutomationHistoryModel = mongoose.model('AutomationHistory', automationHistorySchema);
export const EmailHistoryModel = mongoose.model('EmailHistory', emailHistorySchema);
export const SmartEmailHistoryModel = mongoose.model('SmartEmailHistory', smartEmailHistorySchema);
export const CandidateAssessmentModel = mongoose.model('CandidateAssessment', candidateAssessmentSchema);
export const SettingsModel = mongoose.model('Settings', settingsSchema);
