import express from 'express';
import nodemailer from 'nodemailer'; // Nodemailer is used in the original code, so it should be kept.
import { getGeminiClient, Type, runBackgroundAutomation } from '../../server-core.ts';
import {
  DocumentModel,
  ChatModel,
  QuizModel,
  TaskModel,
  ReminderModel,
  AutomationHistoryModel,
  EmailHistoryModel,
  SmartEmailHistoryModel,
  CandidateAssessmentModel,
  SettingsModel
} from '../db/mongo.ts';
import { EmailLogEntry } from '../../types.ts'; // Assuming EmailLogEntry is defined in types.ts

const router = express.Router();

router.get('/api/automation/history', async (req, res) => {
  try {
    const history = await AutomationHistoryModel.find().sort({ timestamp: -1 });
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/email/send', async (req, res) => {
  try {
    const { email, documentId, type } = req.body;
    if (!email || !documentId || !type) {
      return res.status(400).json({ error: 'Missing required email dispatch parameters (email, documentId, type)' });
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify report details exist
    if (!doc.automationReport) {
      return res.status(400).json({ error: 'Please run AI Automation on the document first to extract content.' });
    }

    const recipient = email.trim();
    const subject = `[SmartDocs AI Automation] Dispatched Study ${type.replace('_', ' ')}: "${doc.title}"`;
    
    let emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <div style="background: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">SmartDocs AI</h1>
          <p style="color: rgba(255, 255, 255, 0.85); margin: 4px 0 0 0; font-size: 13px;">Intelligent Knowledge & Automation Agent</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
          <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">Your Document Intelligence Summary</h2>
          <p>Hello,</p>
          <p>We have processed your document <strong>"${doc.title}"</strong> and compiled your study notes, summary, and practice resources below.</p>
    `;

    let attachmentText = `=== SMARTDOCS AI STUDY DISPATCH ===\nDocument: ${doc.title}\nType: ${type.replace('_', ' ').toUpperCase()}\n\n`;

    if (type === 'summary' || type === 'full_report') {
      emailHtml += `
        <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-left: 4px solid #a855f7; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #a855f7; font-size: 14px; text-transform: uppercase;">Executive Summary</h3>
          <p style="margin: 0; font-size: 14px;">${doc.automationReport.executiveSummary}</p>
        </div>
        <div style="margin-top: 20px;">
          <h3 style="color: #1e293b; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Detailed Summary</h3>
          <p style="font-size: 13.5px;">${doc.automationReport.detailedSummary}</p>
        </div>
        <div style="margin-top: 20px;">
          <h3 style="color: #1e293b; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Key Highlights</h3>
          <ul style="padding-left: 20px; font-size: 13.5px;">
            ${(doc.automationReport.keyPoints || []).map(p => `<li style="margin-bottom: 6px;">${p}</li>`).join('')}
          </ul>
        </div>
      `;
      attachmentText += `EXECUTIVE SUMMARY:\n${doc.automationReport.executiveSummary}\n\nDETAILED SUMMARY:\n${doc.automationReport.detailedSummary}\n\nKEY POINTS:\n${(doc.automationReport.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n`;
    }

    if (type === 'quiz' || type === 'full_report') {
      emailHtml += `
        <div style="margin-top: 24px;">
          <h3 style="color: #06b6d4; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Practice Quiz & Q&A</h3>
          ${(doc.automationReport.multipleChoiceQuestions || []).map((q, idx) => `
            <div style="margin-bottom: 16px; padding: 12px; background-color: #f8fafc; border-radius: 8px; font-size: 13.5px;">
              <p style="margin: 0 0 8px 0; font-weight: bold;">Q${idx + 1}: ${q.question}</p>
              <ul style="margin: 0; padding-left: 20px; list-style-type: decimal;">
                ${(q.options || []).map((opt, oIdx) => `<li>${opt} ${oIdx === q.correctAnswer ? '<strong>(Correct Answer)</strong>' : ''}</li>`).join('')}
              </ul>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">Explanation: ${q.explanation}</p>
            </div>
          `).join('')}
        </div>
      `;
      attachmentText += `PRACTICE QUIZ:\n`;
      (doc.automationReport.multipleChoiceQuestions || []).forEach((q, idx) => {
        attachmentText += `Q${idx + 1}: ${q.question}\nOptions:\n${(q.options || []).map((opt, oIdx) => `  [${oIdx}] ${opt}`).join('\n')}\nCorrect: ${q.correctAnswer}\nExplanation: ${q.explanation}\n\n`;
      });
    }

    if (type === 'study_notes' || type === 'full_report') {
      emailHtml += `
        <div style="margin-top: 24px;">
          <h3 style="color: #a855f7; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Cheat Sheet & Reminders</h3>
          <div style="white-space: pre-line; background-color: #faf5ff; border: 1px dashed #d8b4fe; padding: 16px; border-radius: 8px; font-size: 13px; font-family: monospace;">
            ${doc.automationReport.cheatSheet}
          </div>
        </div>
      `;
      attachmentText += `CHEAT SHEET:\n${doc.automationReport.cheatSheet}\n\nSTUDY GUIDE MANUAL:\n${doc.automationReport.studyNotes}\n\n`;
    }

    emailHtml += `
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 0;">
            This email was automatically generated and sent via your SmartDocs AI agent.
          </p>
        </div>
      </div>
    `;

    // Real Nodemailer SMTP Transport setup
    let previewUrl = '';
    let transportConfig: any;
    let isEthereal = false;

    const gmailUser = process.env.GMAIL_USER || '';
    const gmailAppPass = process.env.GMAIL_APP_PASSWORD || '';

    if (gmailUser && gmailAppPass) {
      // Priority 1: Gmail SMTP — delivers to real inboxes
      transportConfig = {
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPass
        }
      };
      console.log(`[SMTP] Using Gmail SMTP transport (${gmailUser})`);
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      // Priority 2: Custom SMTP server
      transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ''
        }
      };
      console.log(`[SMTP] Using custom SMTP transport (${process.env.SMTP_HOST})`);
    } else {
      // Fallback: Ethereal test sandbox (preview only, no real delivery)
      isEthereal = true;
      try {
        const testAccount = await nodemailer.createTestAccount();
        transportConfig = {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        };
        console.log(`[SMTP] Using Ethereal sandbox (${testAccount.user}) — emails won't reach real inboxes`);
      } catch (err) {
        console.error('[SMTP] Failed to create Ethereal test account:', err);
        return res.status(500).json({ error: 'Email service not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env file.' });
      }
    }

    const transporter = nodemailer.createTransport(transportConfig);
    const senderAddress = gmailUser || process.env.SMTP_USER || 'noreply@smartdocs.ai';

    const mailOptions = {
      from: gmailUser ? `"SmartDocs AI" <${gmailUser}>` : (process.env.SMTP_FROM || '"SmartDocs AI" <noreply@smartdocs.ai>'),
      to: recipient,
      subject: subject,
      text: `SmartDocs AI study materials for "${doc.title}" (${type.replace('_', ' ')}).\n\nPlease check the HTML payload or attachment for details.`,
      html: emailHtml,
      attachments: [{
        filename: `${doc.title.split('.')[0]}_${type}_guide.txt`,
        content: attachmentText
      }]
    };

    let info;
    try {
      info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Message sent: ${info.messageId}`);
      
      const etherealUrl = nodemailer.getTestMessageUrl(info);
      if (etherealUrl) {
        previewUrl = etherealUrl;
        console.log(`[SMTP] Preview URL: ${previewUrl}`);
      }
    } catch (sendErr: any) {
      console.error('[SMTP] Mail dispatch failed:', sendErr);
      const failLog: EmailLogEntry = {
        id: 'eml_' + Math.random().toString(36).substring(2, 11),
        documentId: doc._id.toString(), // Use Mongoose _id
        documentTitle: doc.title,
        recipient,
        subject,
        type,
        dispatchedAt: new Date().toISOString(),
        status: 'failed'
      };
      await EmailHistoryModel.create(failLog); // Save failed log to DB
      return res.status(500).json({ error: `Mail transmission failed: ${sendErr.message}`, log: failLog });
    }

    const logEntry: EmailLogEntry = {
      id: 'eml_' + Math.random().toString(36).substring(2, 11),
      documentId: doc._id.toString(), // Use Mongoose _id
      documentTitle: doc.title,
      recipient,
      subject,
      type,
      dispatchedAt: new Date().toISOString(),
      status: 'success',
      previewUrl: previewUrl || undefined
    };

    await EmailHistoryModel.create(logEntry); // Save successful log to DB

    res.json({ message: 'Email dispatched successfully via SMTP transport.', log: logEntry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/email/history', async (req, res) => {
  try {
    const history = await EmailHistoryModel.find().sort({ dispatchedAt: -1 });
    res.json(history || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/email/config', async (req, res) => {
  try {
    const { autoSendOnUpload, defaultRecipient, includeFlashcards, includeQuiz } = req.body;
    
    const updatedConfig = {
      autoSendOnUpload: !!autoSendOnUpload,
      defaultRecipient: defaultRecipient || "mprakash20007@gmail.com",
      includeFlashcards: !!includeFlashcards,
      includeQuiz: !!includeQuiz
    };

    // Find and update the settings document, or create if it doesn't exist
    const settings = await SettingsModel.findOneAndUpdate(
      {}, // Query for any settings document (assuming only one global settings)
      { emailConfig: updatedConfig },
      { upsert: true, new: true } // Create if not found, return the new document
    );
    
    res.json(settings.emailConfig);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/email/config', async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({});
    res.json(settings?.emailConfig || {
      autoSendOnUpload: false,
      defaultRecipient: "mprakash20007@gmail.com",
      includeFlashcards: true,
      includeQuiz: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;