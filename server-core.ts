import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { createServer as createViteServer } from 'vite';

import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

export enum Type {
  OBJECT = 'OBJECT',
  STRING = 'STRING',
  ARRAY = 'ARRAY',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  INTEGER = 'INTEGER'
}

type GoogleGenAI = any;
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import { DocumentItem, ChatSession, Quiz, UserStats, Message, Difficulty, Task, Reminder, AutomationHistoryEntry, DocumentCategory, AutomationReport, StudyPlan, KnowledgeGraphData, EmailLogEntry, EmailConfig, SmartEmailCategory, SmartEmailDraft, SmartEmailHistoryEntry, SmartEmailTone, SmartEmailAction, CandidateAssessment, CandidateQuizQuestion, CandidateProfile, ResumeAnalysis } from './src/types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 5174;

// Enable large payloads for document uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initialize local database
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  let initialDb: any = {
    documents: [],
    chats: [],
    quizzes: [],
    tasks: [],
    reminders: [],
    automationHistory: [],
    emailHistory: [],
    smartEmailHistory: [],
    candidateAssessments: [],
    emailConfig: {
      autoSendOnUpload: false,
      defaultRecipient: "mprakash20007@gmail.com",
      includeFlashcards: true,
      includeQuiz: true
    }
  };
  if (fs.existsSync(DB_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      initialDb = { ...initialDb, ...existing };
      if (!initialDb.tasks) initialDb.tasks = [];
      if (!initialDb.reminders) initialDb.reminders = [];
      if (!initialDb.automationHistory) initialDb.automationHistory = [];
      if (!initialDb.emailHistory) initialDb.emailHistory = [];
      if (!initialDb.smartEmailHistory) initialDb.smartEmailHistory = [];
      if (!initialDb.candidateAssessments) initialDb.candidateAssessments = [];
      if (!initialDb.emailConfig) initialDb.emailConfig = {
        autoSendOnUpload: false,
        defaultRecipient: "mprakash20007@gmail.com",
        includeFlashcards: true,
        includeQuiz: true
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    } catch (e) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
}

initDb();

// Load / Save DB helpers
export function loadDb(): { 
  documents: DocumentItem[]; 
  chats: ChatSession[]; 
  quizzes: Quiz[];
  tasks: Task[];
  reminders: Reminder[];
  automationHistory: AutomationHistoryEntry[];
  emailHistory: EmailLogEntry[];
  smartEmailHistory: SmartEmailHistoryEntry[];
  candidateAssessments: CandidateAssessment[];
  emailConfig: EmailConfig;
} {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return {
      documents: parsed.documents || [],
      chats: parsed.chats || [],
      quizzes: parsed.quizzes || [],
      tasks: parsed.tasks || [],
      reminders: parsed.reminders || [],
      automationHistory: parsed.automationHistory || [],
      emailHistory: parsed.emailHistory || [],
      smartEmailHistory: parsed.smartEmailHistory || [],
      candidateAssessments: parsed.candidateAssessments || [],
      emailConfig: parsed.emailConfig || {
        autoSendOnUpload: false,
        defaultRecipient: "mprakash20007@gmail.com",
        includeFlashcards: true,
        includeQuiz: true
      }
    };
  } catch (err) {
    console.error('Failed to read db file, resetting database:', err);
    return { 
      documents: [], 
      chats: [], 
      quizzes: [], 
      tasks: [], 
      reminders: [], 
      automationHistory: [],
      emailHistory: [],
      smartEmailHistory: [],
      candidateAssessments: [],
      emailConfig: {
        autoSendOnUpload: false,
        defaultRecipient: "mprakash20007@gmail.com",
        includeFlashcards: true,
        includeQuiz: true
      }
    };
  }
}

export function saveDb(data: { 
  documents: DocumentItem[]; 
  chats: ChatSession[]; 
  quizzes: Quiz[];
  tasks: Task[];
  reminders: Reminder[];
  automationHistory: AutomationHistoryEntry[];
  emailHistory: EmailLogEntry[];
  smartEmailHistory: SmartEmailHistoryEntry[];
  candidateAssessments: CandidateAssessment[];
  emailConfig: EmailConfig;
}) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Automation failed:', err);
  }
}

export async function fetchBlobAsText(url: string): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // Might be raw text already
  try {
    const res = await fetch(url);
    return await res.text();
  } catch (e) {
    console.error('fetchBlobAsText error:', e);
    return '';
  }
}

export async function fetchBlobAsBase64(url: string): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('http')) return url; // Might be base64 already
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (e) {
    console.error('fetchBlobAsBase64 error:', e);
    return '';
  }
}


// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment. Gemini features will fail.');
    }
    ai = ({} as any)({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// API Routes

// GET Stats


// GET Documents


// GET Document Details (includes summary and quiz list)


// GET Document Annotations


// POST Save/Update Document Annotations


// POST Synthesize Highlights into Study Guide


// GET Document Pages (parsed text sections for reading and annotating)


export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getClassificationAndEmbedding(title: string, content: string, type: string): Promise<{ category: DocumentCategory; embedding: number[] }> {
  let category: DocumentCategory = 'Personal';
  let embedding: number[] = new Array(768).fill(0);

  let snippet = content;
  if (type === 'pdf') {
    snippet = 'This is a PDF file document named ' + title;
  }
  if (snippet.length > 2000) {
    snippet = snippet.substring(0, 2000);
  }

  try {
    const client = getGeminiClient();
    if (client && process.env.GEMINI_API_KEY) {
      // 1. Generate Category
      const classPrompt = `You are an expert document organization system.
Analyze the title and content snippet of this document and classify it into exactly one of these categories:
- Academic (textbooks, lecture notes, student assignments, study guides)
- Business (corporate reports, business plans, presentations)
- Finance (invoices, balance sheets, financial statements, budgets)
- Medical (clinical notes, health records, patient history, medical papers)
- Legal (contracts, agreements, terms of service, laws, regulations)
- Technical (code, API documentation, software specs, manuals)
- Research (scientific publications, white papers, thesis, case studies)
- Personal (letters, receipts, diaries, personal notes)

Document Title: "${title}"
Snippet: "${snippet.substring(0, 1000)}"

Return ONLY a JSON object with key "category" matching one of the categories above.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: classPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING }
            },
            required: ['category']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.category) {
        const mapped = parsed.category.trim();
        const validCategories = ['Academic', 'Business', 'Finance', 'Medical', 'Legal', 'Technical', 'Research', 'Personal'];
        const matchedCategory = validCategories.find(c => c.toLowerCase() === mapped.toLowerCase());
        if (matchedCategory) {
          category = matchedCategory as DocumentCategory;
        }
      }

      // 2. Generate Embedding
      try {
        const embedResponse = await client.models.embedContent({
          model: 'text-embedding-004',
          contents: `${title}\n${snippet.substring(0, 1000)}`
        });
        if (embedResponse.embeddings && embedResponse.embeddings.length > 0 && embedResponse.embeddings[0].values) {
          embedding = embedResponse.embeddings[0].values;
        }
      } catch (embedErr) {
        console.error('Failed to generate embedding:', embedErr);
      }
    }
  } catch (err) {
    console.error('Failed to auto-classify or embed document, using fallbacks:', err);
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('invoice') || lowerTitle.includes('receipt') || lowerTitle.includes('bill') || lowerTitle.includes('tax') || lowerTitle.includes('payment')) category = 'Finance';
    else if (lowerTitle.includes('legal') || lowerTitle.includes('contract') || lowerTitle.includes('agreement') || lowerTitle.includes('terms') || lowerTitle.includes('policy')) category = 'Legal';
    else if (lowerTitle.includes('medical') || lowerTitle.includes('clinical') || lowerTitle.includes('health') || lowerTitle.includes('patient') || lowerTitle.includes('clinic')) category = 'Medical';
    else if (lowerTitle.includes('research') || lowerTitle.includes('paper') || lowerTitle.includes('journal') || lowerTitle.includes('thesis')) category = 'Research';
    else if (lowerTitle.includes('class') || lowerTitle.includes('lecture') || lowerTitle.includes('study') || lowerTitle.includes('syllabus') || lowerTitle.includes('course') || lowerTitle.includes('student')) category = 'Academic';
    else if (lowerTitle.includes('code') || lowerTitle.includes('tech') || lowerTitle.includes('api') || lowerTitle.includes('documentation') || lowerTitle.includes('manual') || lowerTitle.includes('spec')) category = 'Technical';
    else if (lowerTitle.includes('business') || lowerTitle.includes('proposal') || lowerTitle.includes('project') || lowerTitle.includes('meeting') || lowerTitle.includes('report')) category = 'Business';
  }

  return { category, embedding };
}

// POST Semantic Search


// POST Upload Document


// DELETE Document


// POST Summarize Document


// GET Automation Status


// POST Automate Document (10-Step Workflow via background job)


// Asynchronous Background Automation Engine (Consolidated into 1 API call for quota and speed optimization)
export async function runBackgroundAutomation(docId: string) {
  const startTime = Date.now();
  console.log(`Starting background automation for document ${docId}`);
  
  // Helper to update status in DB
  const updateStatus = (statusVal: 'running' | 'completed' | 'failed', stepNum: number, progressVal: number, errorVal?: string) => {
    try {
      const db = loadDb();
      const idx = db.documents.findIndex(d => d.id === docId);
      if (idx !== -1) {
        db.documents[idx].automationStatus = {
          status: statusVal,
          currentStep: stepNum,
          progress: progressVal,
          error: errorVal
        };
        saveDb(db);
      }
    } catch (e) {
      console.error("Failed to update status in DB:", e);
    }
  };

  // Start simulation of progress steps in parallel so user sees smooth steps transition
  let currentStepSim = 1;
  let progressSim = 10;
  const simInterval = setInterval(() => {
    if (progressSim < 95) {
      currentStepSim += 1;
      progressSim += 6;
      updateStatus('running', Math.min(15, currentStepSim), progressSim);
    }
  }, 1000);

  try {
    const db1 = loadDb();
    const doc = db1.documents.find(d => d.id === docId);
    if (!doc) {
      clearInterval(simInterval);
      console.error("Document not found in background automation thread.");
      return;
    }

    let textContent = doc.content;
    if (doc.type === 'pdf' && doc.pages && doc.pages.length > 0) {
      textContent = doc.pages.map(p => p.content).join('\n');
    }
    const snippet = textContent.length > 10000 ? textContent.substring(0, 10000) + "\n... [truncated]" : textContent;

    const client = getGeminiClient();
    
    const consolidatedPrompt = `Analyze the document titled "${doc.title}" and generate comprehensive intelligence report, study manuals, interactive quiz materials, definitions, dates, and knowledge graph mappings.
Document Content Snippet:
"${snippet}"

You MUST populate and return exactly this JSON schema:
{
  "documentType": "Research Paper / Contract / Invoice / Legal / Technical / Assignment / Essay / Guide etc",
  "difficultyLevel": "easy / medium / hard",
  "readingTime": 5,
  "insights": {
    "complexity": "Easy / Medium / Hard",
    "readingTime": 5,
    "topicDistribution": [{"topic": "Topic Name", "percentage": 100}],
    "knowledgeCoverage": 80,
    "importantConcepts": ["Concept A", "Concept B"],
    "riskLevel": "Low / Medium / High",
    "missingInformation": ["Gaps or areas for further study"]
  },
  "executiveSummary": "A concise paragraph summarizing the core intent, value, and context.",
  "detailedSummary": "A longer, detailed structured summary of main sections.",
  "keyPoints": ["Key highlight 1", "Key highlight 2"],
  "importantDates": [{"date": "date string", "description": "event description"}],
  "importantNames": ["organization or person"],
  "importantNumbers": [{"number": "123", "description": "context"}],
  "definitions": [{"term": "vocabulary word", "definition": "meaning"}],
  "actionItems": ["action item 1", "action item 2"],
  "faqs": [{"question": "Q1", "answer": "A1"}],
  "flashcards": [{"front": "question", "back": "answer"}],
  "multipleChoiceQuestions": [{"question": "Q", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "reason"}],
  "shortQuestions": [{"question": "Q", "sampleAnswer": "A"}],
  "longQuestions": [{"question": "Q", "sampleAnswer": "A"}],
  "mindMap": "mindmap\\n  root((${doc.title}))\\n    Topic1\\n      Subtopic1",
  "studyNotes": "# Detailed Study Guide\\nMarkdown formatted manual...",
  "revisionNotes": "# Revision Notes\\nMarkdown outline...",
  "cheatSheet": "# Cheat Sheet\\nKey reminders...",
  "studyPlan": {
    "sevenDayPlan": ["Day 1 action"],
    "fifteenDayPlan": ["Week 1 action"],
    "thirtyDayPlan": ["Month 1 action"],
    "dailyGoals": ["Daily goal"],
    "estimatedHours": 10
  },
  "knowledgeGraph": {
    "nodes": [{"id": "n1", "label": "Concept", "type": "concept"}],
    "edges": [{"from": "n1", "to": "n2", "relation": "relates to"}]
  },
  "relatedTopics": ["Topic 1", "Topic 2"]
}
Return ONLY valid JSON.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: consolidatedPrompt,
      config: { responseMimeType: 'application/json' }
    });

    clearInterval(simInterval);

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini failed to return content during consolidated background automation.');
    }

    const parsedData = JSON.parse(resultText);
    parsedData.createdAt = new Date().toISOString();

    // Save final report data and complete status
    const dbFinal = loadDb();
    const docIdx = dbFinal.documents.findIndex(d => d.id === docId);
    if (docIdx === -1) {
      console.error("Document deleted while running automation background process.");
      return;
    }

    const currentDoc = dbFinal.documents[docIdx];

    // Create Tasks
    const extractedTasks: Task[] = (parsedData.tasks || []).map((t: any) => ({
      id: 'task_' + Math.random().toString(36).substring(2, 11),
      documentId: currentDoc.id,
      documentTitle: currentDoc.title,
      title: t.title,
      type: t.type || 'action_item',
      date: t.date || undefined,
      completed: false
    }));

    if (extractedTasks.length === 0 && parsedData.actionItems) {
      parsedData.actionItems.slice(0, 5).forEach((item: string) => {
        extractedTasks.push({
          id: 'task_' + Math.random().toString(36).substring(2, 11),
          documentId: currentDoc.id,
          documentTitle: currentDoc.title,
          title: item,
          type: 'action_item',
          completed: false
        });
      });
    }

    // Create Reminders
    const extractedReminders: Reminder[] = (parsedData.reminders || []).map((r: any) => ({
      id: 'rem_' + Math.random().toString(36).substring(2, 11),
      documentId: currentDoc.id,
      documentTitle: currentDoc.title,
      title: r.title,
      type: r.type || 'deadline',
      date: r.date,
      status: 'pending'
    }));

    if (extractedReminders.length === 0 && parsedData.importantDates) {
      parsedData.importantDates.slice(0, 3).forEach((d: any) => {
        extractedReminders.push({
          id: 'rem_' + Math.random().toString(36).substring(2, 11),
          documentId: currentDoc.id,
          documentTitle: currentDoc.title,
          title: d.description,
          type: 'deadline',
          date: d.date,
          status: 'pending'
        });
      });
    }

    dbFinal.tasks = dbFinal.tasks.filter(t => t.documentId !== currentDoc.id).concat(extractedTasks);
    dbFinal.reminders = dbFinal.reminders.filter(r => r.documentId !== currentDoc.id).concat(extractedReminders);

    const report: AutomationReport = {
      id: 'rep_' + Math.random().toString(36).substring(2, 11),
      documentId: currentDoc.id,
      documentType: parsedData.documentType || 'Document',
      readingTime: parsedData.readingTime || 5,
      difficultyLevel: (parsedData.difficultyLevel || 'medium') as Difficulty,
      executiveSummary: parsedData.executiveSummary || '',
      detailedSummary: parsedData.detailedSummary || '',
      keyPoints: parsedData.keyPoints || [],
      importantDates: parsedData.importantDates || [],
      importantNames: parsedData.importantNames || [],
      importantNumbers: parsedData.importantNumbers || [],
      definitions: parsedData.definitions || [],
      actionItems: parsedData.actionItems || [],
      faqs: parsedData.faqs || [],
      flashcards: parsedData.flashcards || [],
      multipleChoiceQuestions: (parsedData.multipleChoiceQuestions || []).map((q: any) => ({
        id: 'q_' + Math.random().toString(36).substring(2, 11),
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer || 0,
        explanation: q.explanation || ''
      })),
      shortQuestions: parsedData.shortQuestions || [],
      longQuestions: parsedData.longQuestions || [],
      studyNotes: parsedData.studyNotes || '',
      revisionNotes: parsedData.revisionNotes || '',
      cheatSheet: parsedData.cheatSheet || '',
      mindMap: parsedData.mindMap || '',
      relatedTopics: parsedData.relatedTopics || [],
      createdAt: new Date().toISOString()
    };

    const studyPlan: StudyPlan = {
      documentId: currentDoc.id,
      sevenDayPlan: parsedData.studyPlan?.sevenDayPlan || [],
      fifteenDayPlan: parsedData.studyPlan?.fifteenDayPlan || [],
      thirtyDayPlan: parsedData.studyPlan?.thirtyDayPlan || [],
      dailyGoals: parsedData.studyPlan?.dailyGoals || [],
      estimatedHours: parsedData.studyPlan?.estimatedHours || 10,
      difficultyLevel: parsedData.difficultyLevel || 'Medium',
      completionPercentage: 0
    };

    const knowledgeGraph: KnowledgeGraphData = {
      nodes: parsedData.knowledgeGraph?.nodes || [],
      edges: parsedData.knowledgeGraph?.edges || []
    };

    const insights = {
      complexity: parsedData.insights?.complexity || 'Medium',
      readingTime: parsedData.readingTime || 5,
      topicDistribution: parsedData.insights?.topicDistribution || [],
      knowledgeCoverage: parsedData.insights?.knowledgeCoverage || 70,
      importantConcepts: parsedData.insights?.importantConcepts || [],
      riskLevel: (parsedData.insights?.riskLevel || 'Low') as 'Low' | 'Medium' | 'High',
      missingInformation: parsedData.insights?.missingInformation || []
    };

    dbFinal.documents[docIdx].automationReport = report;
    dbFinal.documents[docIdx].studyPlan = studyPlan;
    dbFinal.documents[docIdx].knowledgeGraph = knowledgeGraph;
    dbFinal.documents[docIdx].insights = insights;

    const executionTime = Date.now() - startTime;

    const historyEntry: AutomationHistoryEntry = {
      id: 'hist_' + Math.random().toString(36).substring(2, 11),
      documentId: currentDoc.id,
      documentTitle: currentDoc.title,
      date: new Date().toISOString(),
      actionsPerformed: [
        'Document classification',
        'Executive summary extraction',
        'Q&A generation',
        'Flashcards setup',
        'Mermaid mindmap drawing',
        'Task and Reminder parsing',
        'Study timeline planning'
      ],
      executionTimeMs: executionTime,
      status: 'success'
    };
    dbFinal.automationHistory.push(historyEntry);

    dbFinal.documents[docIdx].automationStatus = {
      status: 'completed',
      currentStep: 10,
      progress: 100
    };

    saveDb(dbFinal);
    console.log(`[Background Agent ${docId}] Done! Report generated and status updated.`);

  } catch (err: any) {
    clearInterval(simInterval);
    console.error(`[Background Agent ${docId}] Failed overall:`, err);
    updateStatus('failed', 0, 0, err.message || 'Workflow execution error');
  }
}

// GET Email Config


// POST Save Email Config


// GET Email History


// POST Send Email Automation


// GET Tasks


// POST Toggle Task Complete


// GET Reminders


// GET Automation History


// GET Chats for Document (or All Chats)


// POST New Chat Session


// POST Send Message & Get Gemini Reply


// GET Quizzes for Document (or All)


// POST Create Quiz for Document


// POST Submit Quiz Score


// ─── FAST DOCUMENT DETECTION ─────────────────────────────────────────
// Helper: Extract candidate profile from resume content using Gemini
export async function extractCandidateProfile(doc: any): Promise<CandidateProfile> {
  const client = getGeminiClient();
  const prompt = `You are a professional HR assistant and ATS resume parser. Extract structural profile details from this resume.
Include the candidate's name, email, phone number, key technical/soft skills, detailed professional experience summaries, academic education, projects, and certifications.
Make sure to extract phone numbers and email addresses if visible. Return the skills as a clean list of tech/role skills.`;

  let contents: any;
  if (doc.type === 'pdf') {
    contents = [
      { inlineData: { mimeType: 'application/pdf', data: doc.content } },
      prompt
    ];
  } else {
    contents = `${prompt}\n\nRESUME TEXT:\n${doc.content}`;
  }

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experience: { type: Type.STRING },
          education: { type: Type.STRING },
          projects: { type: Type.STRING },
          certifications: { type: Type.STRING }
        },
        required: ['name', 'email', 'phone', 'skills', 'experience', 'education', 'projects', 'certifications']
      }
    }
  });

  const profile: CandidateProfile = JSON.parse(response.text || '{}');
  // Clean fallback values if missing
  if (!profile.name) profile.name = 'Candidate Name';
  if (!profile.email) profile.email = 'candidate@example.com';
  if (!profile.phone) profile.phone = 'Not Provided';
  if (!profile.skills) profile.skills = [];
  return profile;
}

// ─── FAST DOCUMENT DETECTION ─────────────────────────────────────────
// POST /api/smart-email/detect — Quickly detect document category


// ─── RESUME ROLE-PLAY QUIZ ────────────────────────────────────────────
// POST /api/smart-email/resume-quiz — Generate role quiz based on resume


// ─── QUESTION BANK ANSWER KEY ─────────────────────────────────────────
// Helper: Generate a beautiful, multi-page PDF Answer Key using jsPDF
export function generateAnswerKeyPdf(docTitle: string, questionsList: any[]): Buffer {
  const doc = new jsPDF();
  let y = 60;
  const pageHeight = 297;

  // Header band (orange/amber accent)
  doc.setFillColor(245, 158, 11); // #f59e0b
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("EXAM ANSWER KEY", 20, 26);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SmartDocs AI Study Suite", 140, 26);

  // Body Content
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(11);
  doc.text(`Document: ${docTitle}`, 20, 50);
  doc.line(20, 52, 190, 52);
  
  questionsList.forEach((q: any, idx: number) => {
    // Add page check
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    const qText = `Q${idx + 1}. ${q.question || q.number || 'Question'}`;
    const wrappedQ = doc.splitTextToSize(qText, 170);
    doc.text(wrappedQ, 20, y);
    y += (wrappedQ.length * 5) + 3;

    doc.setFont("helvetica", "normal");
    const ansText = `Correct Answer: ${q.answer || ''}`;
    const wrappedAns = doc.splitTextToSize(ansText, 170);
    doc.text(wrappedAns, 20, y);
    y += (wrappedAns.length * 5) + 3;

    if (q.explanation) {
      doc.setFont("helvetica", "italic");
      const expText = `Explanation: ${q.explanation}`;
      const wrappedExp = doc.splitTextToSize(expText, 170);
      doc.text(wrappedExp, 20, y);
      y += (wrappedExp.length * 5) + 8;
    }
  });

  // Footer page mark
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Generated by SmartDocs AI Study System. All rights reserved.", 20, 285);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

// POST /api/smart-email/answer-key — Generate full answer key for question bank


// ═══════════════════════════════════════════════════════════════════════
// ██  SMART BUSINESS EMAIL AUTOMATION API
// ═══════════════════════════════════════════════════════════════════════

// Helper: Build a beautiful HTML email template
export function buildEmailHtml(subject: string, body: string, category: string, senderName: string): string {
  const categoryColors: Record<string, string> = {
    resume: '#7c3aed',
    assignment: '#0ea5e9',
    question_bank: '#f59e0b',
    business_report: '#10b981',
    invoice: '#ef4444',
    legal_contract: '#6366f1',
    cover_letter: '#ec4899',
    general: '#8b5cf6'
  };
  const accentColor = categoryColors[category] || '#7c3aed';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentColor},${accentColor}cc);padding:32px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${subject}</h1>
                    <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">SmartDocs AI • ${category.replace(/_/g, ' ').toUpperCase()}</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;text-align:center;line-height:48px;font-size:24px;">📧</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <div style="color:#e2e8f0;font-size:14px;line-height:1.8;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">Warm regards,</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${accentColor};">${senderName}</p>
                    <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">Powered by SmartDocs AI Intelligence Engine</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:10px;color:#64748b;letter-spacing:0.5px;">
                This email was generated by SmartDocs AI — AI-Powered Document Intelligence Platform<br/>
                © ${new Date().getFullYear()} SmartDocs AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper: Get Gmail SMTP transporter
export function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Gmail SMTP credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

// Helper: Map category to available actions
function getCategoryActions(category: SmartEmailCategory): { action: SmartEmailAction; label: string; description: string }[] {
  const map: Record<SmartEmailCategory, { action: SmartEmailAction; label: string; description: string }[]> = {
    resume: [
      { action: 'offer_letter', label: 'Offer Letter', description: 'Generate a professional job offer letter based on the candidate\'s resume' },
      { action: 'rejection_letter', label: 'Rejection Letter', description: 'Generate a polite, professional rejection letter with constructive feedback' }
    ],
    assignment: [
      { action: 'assignment_answers', label: 'Assignment Answers', description: 'Solve the assignment and send complete answers with explanations' }
    ],
    question_bank: [
      { action: 'answer_key', label: 'Answer Key', description: 'Generate comprehensive answer key with detailed explanations for each question' }
    ],
    business_report: [
      { action: 'executive_summary', label: 'Executive Summary', description: 'Generate an executive summary email highlighting key findings and recommendations' }
    ],
    invoice: [
      { action: 'payment_reminder', label: 'Payment Confirmation / Reminder', description: 'Generate a payment acknowledgment or polite payment reminder email' }
    ],
    legal_contract: [
      { action: 'contract_review', label: 'Contract Review Summary', description: 'Summarize key clauses, obligations, and risk areas in the contract' }
    ],
    cover_letter: [
      { action: 'acknowledgment', label: 'Application Acknowledgment', description: 'Generate a formal acknowledgment of the job application received' }
    ],
    general: [
      { action: 'general_response', label: 'General Response', description: 'Generate a professional response email based on the document contents' }
    ]
  };
  return map[category] || map.general;
}

// 1. POST /api/smart-email/analyze — AI analyzes document and generates email draft


// 2. POST /api/smart-email/send — Send the generated email via Gmail SMTP


// 3. GET /api/smart-email/history — Return all smart email history


// 4. GET /api/smart-email/templates — Return available email templates per category


// 5. POST /api/smart-email/regenerate — Regenerate draft with different tone/instructions


// ─── CANDIDATE ASSESSMENT LINK DISPATCHING & PORTAL BACKEND ───────────

// Helper: Send invite email template
export function sendAssessmentInviteEmail(candidateEmail: string, candidateName: string, role: string, link: string, expiryTime: string) {
  const transporter = getEmailTransporter();
  const subject = `Assessment Invitation: ${role} Suitability Test - SmartDocs AI`;
  const bodyHtml = `
    <div style="background-color: #1a1a2e; border: 1px solid #7c3aed33; border-radius: 12px; padding: 24px; color: #ffffff;">
      <h2 style="color: #7c3aed; margin-top: 0;">Hello ${candidateName},</h2>
      <p>You have been invited by <strong>SmartDocs AI</strong> to complete the screening assessment for the position of <strong>${role}</strong>.</p>
      <p>This automated assessment evaluates your fit for the role based on your resume, technical skills, and problem-solving abilities.</p>
      
      <div style="background-color: rgba(255,255,255,0.05); border-left: 4px solid #0ea5e9; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #0ea5e9; display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">Assessment Details</strong>
        <span style="display: block; font-size: 13px; margin-bottom: 4px;"><strong>Position:</strong> ${role}</span>
        <span style="display: block; font-size: 13px;"><strong>Time Limit:</strong> 10 Minutes</span>
        <span style="display: block; font-size: 13px; color: #f59e0b; margin-top: 4px;"><strong>Link Expiry:</strong> ${expiryTime}</span>
      </div>

      <p>Please click the button below to launch the assessment portal. Note that you must complete the quiz in <strong>one sitting</strong>, and our anti-cheat protocols (tab tracking, fullscreen lock, copy-paste block) will be active.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${link}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);">Start Assessment Portal</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">If the button above does not work, copy and paste this link in your browser:<br>
      <a href="${link}" style="color: #0ea5e9; text-decoration: underline;">${link}</a></p>
    </div>
  `;

  const emailHtml = buildEmailHtml(subject, bodyHtml, 'resume', 'SmartDocs AI Recruitment');
  return transporter.sendMail({
    from: `"SmartDocs AI Recruitment" <${process.env.GMAIL_USER}>`,
    to: candidateEmail,
    subject: subject,
    html: emailHtml,
    text: `Hello ${candidateName}, please start your assessment for ${role} here: ${link} (Expires: ${expiryTime})`
  });
}

// Fallback assessment generator
export function getFallbackAssessmentQuestions(role: string): CandidateQuizQuestion[] {
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole.includes('develop') || normalizedRole.includes('engineer') || normalizedRole.includes('web') || normalizedRole.includes('code') || normalizedRole.includes('tech')) {
    return [
      {
        question: "A high-priority bug is reported in production, but it is outside of your immediate team's codebase. How do you respond?",
        options: [
          "A. Ignore it since it is another team's responsibility.",
          "B. Investigate the bug, gather context, and coordinate with the target team to resolve it.",
          "C. Escalate to management immediately without checking the logs.",
          "D. Refactor your own code instead."
        ],
        correctAnswer: 1,
        explanation: "Collaborating across teams to resolve critical production bugs demonstrates strong ownership and team alignment."
      },
      {
        question: "Your project deadline is tomorrow, and you realize a key API dependency is returning internal server errors. What is your first step?",
        options: [
          "A. Delay your release indefinitely without notifying stakeholders.",
          "B. Write a mock data layer to bypass the issue temporarily, write test cases, and alert the API team and stakeholders.",
          "C. Panic and blame the backend team.",
          "D. Revert all your progress."
        ],
        correctAnswer: 1,
        explanation: "Creating a mock allows you to continue demonstrating UI capabilities while proactively communicating and tracking dependencies."
      },
      {
        question: "A senior team member suggests a code design that you believe will cause scalability issues later. How do you handle this?",
        options: [
          "A. Argue loudly during the standup.",
          "B. Agree blindly to avoid any conflict.",
          "C. Present concrete performance metrics and benchmark examples in a constructive review thread.",
          "D. Override their code changes secretly."
        ],
        correctAnswer: 2,
        explanation: "Constructive peer review backed by data and metrics fosters healthy collaboration and solid engineering standards."
      },
      {
        question: "Which of the following describes the most secure approach for storing sensitive client credentials in a web application?",
        options: [
          "A. Storing them in a public git repository.",
          "B. Saving them in plain text in db.json.",
          "C. Injecting them as environment variables encrypted in transit and at rest using secret vaults.",
          "D. Hardcoding them in index.html."
        ],
        correctAnswer: 2,
        explanation: "Secret managers and environment variables prevent credential leaks and keep keys protected across environments."
      },
      {
        question: "You have been asked to optimize a slow landing page. Which optimization provides the highest initial return?",
        options: [
          "A. Redesigning the entire logo.",
          "B. Lazy-loading media assets, minifying bundle sizes, and implementing server-side caching.",
          "C. Adding more cool animations to keep the user waiting.",
          "D. Deleting the style rules."
        ],
        correctAnswer: 1,
        explanation: "Optimizing bundles, caching, and lazy loading directly impacts PageSpeed metrics and UX bounce rates."
      },
      {
        question: "During a code review, a teammate leaves comments criticizing your approach without offering an alternative. How do you respond?",
        options: [
          "A. Delete their comments and merge the pull request anyway.",
          "B. Schedule a brief alignment sync or comment politely asking them to clarify their concerns and suggest preferred alternatives.",
          "C. Criticize their recent pull requests in return.",
          "D. Complain to the engineering manager."
        ],
        correctAnswer: 1,
        explanation: "Responding constructively and seeking alignment resolves coding disagreements professionally and improves overall quality."
      },
      {
        question: "You need to integrate a third-party API that has incomplete or outdated documentation. What is the best way to proceed?",
        options: [
          "A. Write integration code guessing parameters and test directly in production.",
          "B. Set up a local sandbox environment, use tools like Postman to inspect actual network responses, and build defensive parsers.",
          "C. Refuse to perform the integration until they update the docs.",
          "D. Guess the API contract and hope it works."
        ],
        correctAnswer: 1,
        explanation: "Inspecting actual network responses in sandbox environments helps verify API behavior when documentation is lacking."
      },
      {
        question: "A Git merge conflict occurs on a shared utility file during a release branch preparation. How should you resolve it?",
        options: [
          "A. Force push your branch to overwrite other developers' changes.",
          "B. Coordinate with the authors of the conflicting changes, understand the overlapping requirements, and merge manually with test coverage.",
          "C. Delete the conflicting file and rewrite it from scratch.",
          "D. Abandon the release branch completely."
        ],
        correctAnswer: 1,
        explanation: "Collaborative conflict resolution prevents code regressions and ensures logic from all branches is preserved correctly."
      },
      {
        question: "Your team is experiencing high technical debt, causing new feature releases to slow down. What is the most effective approach?",
        options: [
          "A. Ignore it and push features as fast as possible.",
          "B. Allocate a fixed percentage of each sprint (e.g., 20%) to refactoring and stability tasks, prioritizing by impact on code speed.",
          "C. Stop all feature work for 6 months to rewrite the entire codebase.",
          "D. Hire freelance developers to write quick patches."
        ],
        correctAnswer: 1,
        explanation: "Consistent, incremental refactoring balanced with business feature delivery is the healthiest way to manage tech debt."
      },
      {
        question: "Which approach best protects a REST API against brute-force attacks and abuse?",
        options: [
          "A. Changing the port number frequently.",
          "B. Implementing rate limiting, IP throttling, and robust JSON Web Token (JWT) validation.",
          "C. Hiding the API documentation.",
          "D. Disabling HTTPS."
        ],
        correctAnswer: 1,
        explanation: "Rate limiting and token security are standard practices for securing public-facing REST endpoints."
      }
    ];
  }
  
  // Default general fallback
  return [
    {
      question: "You have multiple overlapping tasks due at the end of the day. How do you structure your schedule?",
      options: [
        "A. Work on whatever seems easiest first.",
        "B. Prioritize based on business impact, communicate adjustments to stakeholders, and execute systematically.",
        "C. Leave work early to avoid the stress.",
        "D. Try to do all tasks simultaneously without focusing."
      ],
      correctAnswer: 1,
      explanation: "Prioritizing by business value and keeping stakeholders updated is key to effective task management."
    },
    {
      question: "A client reports that they are dissatisfied with the recent project draft presentation. How do you handle this?",
      options: [
        "A. Inform the client that they are wrong.",
        "B. Ignore their feedback and send the same draft again.",
        "C. Schedule a feedback alignment session, listen actively to concerns, and outline clear action items for revision.",
        "D. Cancel the contract immediately."
      ],
      correctAnswer: 2,
      explanation: "Active listening and structured revision timelines build client trust and project alignment."
    },
    {
      question: "What is the most effective way to align team members on a new process rollout?",
      options: [
        "A. Sending a massive 50-page text document without any context.",
        "B. Mandating the change immediately without explanation.",
        "C. Conducting a brief interactive walkthrough, sharing visual document guides, and asking for anonymous feedback.",
        "D. Pretending nothing changed."
      ],
      correctAnswer: 2,
      explanation: "Interactive rollouts and clear, summarized docs ensure higher adoption rates and team alignment."
    },
    {
      question: "A task requires tool integrations that you have never used before. How do you proceed?",
      options: [
        "A. Reject the task immediately.",
        "B. Read documentation, review existing codebases, create a small sandbox script, and ask senior members for guidance.",
        "C. Guess how it works without reading references.",
        "D. Wait until someone does it for you."
      ],
      correctAnswer: 1,
      explanation: "Leveraging resources (docs/references) and utilizing sandboxes is the standard way to learn new tools."
    },
    {
      question: "How do you maintain code/documentation integrity when making changes?",
      options: [
        "A. Overwrite the entire file blindly.",
        "B. Use targeted, precise edits, preserve unrelated comments, and verify changes programmatically.",
        "C. Delete all comments to make the file smaller.",
        "D. Commit code without testing."
      ],
      correctAnswer: 1,
      explanation: "Precise edits and verification guard against regression bugs and keep documentation clean."
    },
    {
      question: "You realize you made a mistake in a presentation you delivered to the executive board yesterday. What should you do?",
      options: [
        "A. Keep quiet and hope no one notices.",
        "B. Proactively send a follow-up note to the attendees with the corrected data, briefly explaining the error.",
        "C. Blame the intern who compiled the data.",
        "D. Delete the slide deck from the shared server."
      ],
      correctAnswer: 1,
      explanation: "Proactively correcting mistakes build professional credibility and maintains data integrity."
    },
    {
      question: "A project requirement changes mid-way through execution. What is the first thing you should do?",
      options: [
        "A. Complain to the client about the changes.",
        "B. Assess the impact on timeline and resources, document the adjustments, and align with the project team.",
        "C. Continue with the original requirements to finish faster.",
        "D. Cancel the project immediately."
      ],
      correctAnswer: 1,
      explanation: "Assessing impact and realigning with stakeholders is crucial when scope adjustments occur mid-project."
    },
    {
      question: "A colleague is struggling to complete their part of a shared project. How do you support them?",
      options: [
        "A. Take over their work secretly to avoid talking to them.",
        "B. Offer assistance, identify specific bottlenecks, and work together to get the tasks back on track.",
        "C. Report their performance to HR immediately.",
        "D. Complete your part and ignore their issues."
      ],
      correctAnswer: 1,
      explanation: "Constructive peer support and collaboration help teams meet deadlines and build positive work dynamics."
    },
    {
      question: "Which of the following is the best practice for managing passwords and sensitive documentation?",
      options: [
        "A. Writing them on sticky notes around your monitor.",
        "B. Using a centralized, secure credential manager with multi-factor authentication.",
        "C. Emailing them in plain text to your personal account.",
        "D. Saving them in a shared Excel file named 'passwords'."
      ],
      correctAnswer: 1,
      explanation: "Centralized credential managers with MFA provide high security and prevent credential leakage."
    },
    {
      question: "What is the primary benefit of maintaining clear, written documentation for team workflows?",
      options: [
        "A. It fills up storage space on the servers.",
        "B. It reduces onboarding time, mitigates knowledge silos, and ensures consistent workflow execution.",
        "C. It gives management a reason to micro-manage.",
        "D. It prevents team members from talking to each other."
      ],
      correctAnswer: 1,
      explanation: "Documentation mitigates operational risk by preserving knowledge and guiding team alignment."
    }
  ];
}

// 1. POST /api/smart-email/assessments — Create invite, generate quiz, send email


// 2. GET /api/smart-email/assessments — List invites (optionally filtered by documentId)


// 3. GET /api/smart-email/assessments/:id — Candidate retrieves quiz questions (security: hide correct answers)


// Telemetry sync endpoint for timer and anti-cheat triggers


// 4. POST /api/smart-email/assessments/:id/submit — Candidate submits quiz answers


// 5. POST /api/smart-email/assessments/:id/decision — Send final offer/rejection email



// Helper: Generate a beautiful, branded PDF Offer Letter using jsPDF
export function generateOfferLetterPdf(candidateName: string, role: string): Buffer {
  const doc = new jsPDF();
  
  // Header background banner (premium brand color HSL/RGB)
  doc.setFillColor(124, 58, 237); // #7c3aed
  doc.rect(0, 0, 210, 40, 'F');
  
  // Header title text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("OFFICIAL JOB OFFER", 20, 26);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SmartDocs AI Recruitment Suite", 140, 26);
  
  // Main body text settings
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(11);
  
  const currentDate = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  doc.text(`Date: ${currentDate}`, 20, 55);
  doc.text(`Ref: SD-OFFER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`, 20, 62);
  
  doc.setFont("helvetica", "bold");
  doc.text("TO CANDIDATE:", 20, 75);
  doc.setFont("helvetica", "normal");
  doc.text(`${candidateName}`, 20, 82);
  doc.text("Email Status: Verified Screened", 20, 89);
  
  doc.setFont("helvetica", "bold");
  doc.text(`RE: Offer of Employment for the Position of ${role}`, 20, 105);
  
  doc.setFont("helvetica", "normal");
  const introParagraph = `We are absolutely thrilled to extend you a formal offer of employment for the position of ${role} at SmartDocs AI. Following the review of your academic suitability quiz, where you cleared our passing grade, and your performance on our AI interview evaluation, our panel has approved your hire.`;
  const wrappedIntro = doc.splitTextToSize(introParagraph, 170);
  doc.text(wrappedIntro, 20, 115);
  
  doc.setFont("helvetica", "bold");
  doc.text("Terms of Offer:", 20, 145);
  
  doc.setFont("helvetica", "normal");
  doc.text(`• Position Title: ${role}`, 25, 155);
  doc.text("• Department: Core Software Engineering & Operations", 25, 162);
  doc.text("• Starting Date: [Start Date Placeholder - To be aligned upon acceptance]", 25, 169);
  doc.text("• Compensation Structure: [Base Salary Placeholder - Market Competitive]", 25, 176);
  doc.text("• Reporting Structure: Director of Engineering", 25, 183);
  
  const closingText = `Please confirm your acceptance of this offer by signing below and returning this letter within five business days. We are confident that your background and skills will make a valuable addition to our core team and look forward to building innovative systems together.`;
  const wrappedClosing = doc.splitTextToSize(closingText, 170);
  doc.text(wrappedClosing, 20, 200);
  
  // Signatures
  doc.line(20, 240, 90, 240);
  doc.text("Authorized HR Signature", 20, 245);
  doc.text("SmartDocs AI Recruitment Office", 20, 250);
  
  doc.line(120, 240, 190, 240);
  doc.text("Candidate Acceptance Signature", 120, 245);
  doc.text("Date:", 120, 250);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Confidential Offer Letter - SmartDocs AI, Inc. All rights reserved.", 20, 285);
  
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

// 6. GET /api/smart-email/assessments/:id/interview-questions — Retrieve/Generate 5 Interview Questions


// 7. POST /api/smart-email/assessments/:id/interview-submit — Grade interview & decide Offer vs Reject


// 8. GET /api/smart-email/assessments/:id/offer-letter — Download dynamic PDF Offer Letter


// 9. GET /api/smart-email/documents/:id/answer-key-pdf — Download dynamic PDF Answer Key


// 10. POST /api/smart-email/assessments/:id/override — Recruiter manual overrides



