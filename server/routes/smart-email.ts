import express from 'express';
import { getGeminiClient, fetchBlobAsText, fetchBlobAsBase64, Type, runBackgroundAutomation, getFallbackAssessmentQuestions, sendAssessmentInviteEmail, generateOfferLetterPdf, getEmailTransporter, buildEmailHtml, generateAnswerKeyPdf, extractCandidateProfile } from '../../server-core.ts';
import { DocumentModel, CandidateAssessmentModel, SmartEmailHistoryModel } from '../db/mongo.ts';
import { CandidateAssessment, CandidateProfile, CandidateQuizQuestion, ResumeAnalysis, SmartEmailAction, SmartEmailCategory, SmartEmailDraft, SmartEmailHistoryEntry, SmartEmailTone } from '../../types.ts';

const router = express.Router();

// Helper to get category actions (assuming this is a local utility function)
const getCategoryActions = (category: SmartEmailCategory) => {
  switch (category) {
    case 'resume':
      return [
        { action: 'offer_letter', label: 'Generate Offer Letter' },
        { action: 'rejection_letter', label: 'Generate Rejection Letter' },
        { action: 'interview_invite', label: 'Invite to Interview' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'assignment':
      return [
        { action: 'assignment_answers', label: 'Generate Answers' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'question_bank':
      return [
        { action: 'answer_key', label: 'Generate Answer Key' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'business_report':
      return [
        { action: 'executive_summary', label: 'Generate Executive Summary' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'invoice':
      return [
        { action: 'payment_reminder', label: 'Generate Payment Reminder' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'legal_contract':
      return [
        { action: 'contract_review', label: 'Generate Contract Review' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'cover_letter':
      return [
        { action: 'acknowledgment', label: 'Generate Acknowledgment' },
        { action: 'general_response', label: 'General Response' }
      ];
    case 'general':
    default:
      return [
        { action: 'general_response', label: 'General Response' }
      ];
  }
};

router.post('/api/smart-email/assessments/:id/override', async (req, res) => {
  try {
    const { action, decision } = req.body;
    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    const doc = await DocumentModel.findById(assess.documentId);

    if (action === 'resend') {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const assessmentLink = `${appUrl}/?assessId=${assess.id}`;
      const expiryTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      await sendAssessmentInviteEmail(assess.candidateEmail, assess.candidateName, assess.role, assessmentLink, expiryTime);
    }
    else if (action === 'reopen') {
      assess.completed = false;
      assess.score = undefined;
      assess.timeRemaining = 600;
      assess.cheatAttemptsCount = 0;
      assess.finalDecision = 'pending';
      assess.interviewInvited = false;
      assess.interviewCompleted = false;
    }
    else if (action === 'regenerate') {
      let questions = getFallbackAssessmentQuestions(assess.role);
      try {
        const client = getGeminiClient();
        const quizPrompt = `Generate exactly 10 multiple-choice questions for candidate ${assess.candidateName} applying for ${assess.role} at medium difficulty level.`;
        const response = await client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: quizPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
              }
            }
          }
        });
        const parsed = JSON.parse(response.text || '[]');
        if (parsed.length >= 10) questions = parsed.slice(0, 10);
      } catch (err) {
        console.warn('Override regenerate failed, using fallbacks');
      }
      assess.questions = questions.sort(() => Math.random() - 0.5);
      assess.completed = false;
      assess.score = undefined;
      assess.timeRemaining = 600;
      assess.cheatAttemptsCount = 0;
    }
    else if (action === 'reevaluate') {
      if (!decision || (decision !== 'offer' && decision !== 'rejection')) {
        return res.status(400).json({ error: 'Valid decision ("offer" | "rejection") is required for re-evaluation.' });
      }

      const isOffer = decision === 'offer';
      assess.finalDecision = isOffer ? 'hired' : 'rejected';
      assess.decisionSent = isOffer ? 'offer' : 'rejection';

      // Dispatch email correspondence
      let subject = '';
      let htmlBody = '';
      let pdfBuffer: Buffer | null = null;

      if (isOffer) {
        subject = `Job Offer: ${assess.role} - SmartDocs AI`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Congratulations! After a manual re-evaluation of your screening results for the position of <strong>${assess.role}</strong>, we are pleased to extend you a formal offer of employment.</p>
<p>Your formal Job Offer PDF is attached to this email. Please review it at your convenience.</p>`;
        try {
          pdfBuffer = generateOfferLetterPdf(assess.candidateName, assess.role);
          assess.offerLetterUrl = `/api/smart-email/assessments/${assess.id}/offer-letter`;
        } catch (pdfErr) {
          console.error(pdfErr);
        }
      } else {
        subject = `Application Decision: ${assess.role} - SmartDocs AI`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Thank you for your interest in the position of <strong>${assess.role}</strong> at SmartDocs AI.</p>
<p>After manual review, we regret to inform you that we will not be moving forward with your application. We wish you the best in your search.</p>`;
      }

      try {
        const transporter = getEmailTransporter();
        const fullHtml = buildEmailHtml(subject, htmlBody, 'resume', 'Recruitment Office');
        const mailOptions: any = {
          from: `"SmartDocs AI Recruitment" <${process.env.GMAIL_USER}>`,
          to: assess.candidateEmail,
          subject: subject,
          html: fullHtml,
          text: htmlBody.replace(/<[^>]*>/g, '')
        };
        if (pdfBuffer) {
          mailOptions.attachments = [
            {
              filename: `Job_Offer_Letter_${assess.candidateName.replace(/\s+/g, '_')}.pdf`,
              content: pdfBuffer
            }
          ];
        }
        await transporter.sendMail(mailOptions);
      } catch (smtpErr: any) {
        console.error('SMTP override mail failed:', smtpErr);
      }
    }
    else if (action === 'rerun_interview') {
      assess.interviewCompleted = false;
      assess.interviewAnswers = undefined;
      assess.interviewMetrics = undefined;
      assess.finalDecision = 'pending';
    }

    await assess.save();
    res.json({ success: true, assessment: assess });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/smart-email/documents/:id/answer-key-pdf', async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) return res.status(404).send('Document not found.');
    if (!doc.answerKeyQuestions) return res.status(400).send('Answer Key not available.');

    const pdfBuffer = generateAnswerKeyPdf(doc.title, doc.answerKeyQuestions);
    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).send(err.message || 'Error generating answer key PDF.');
  }
});

router.get('/api/smart-email/assessments/:id/offer-letter', async (req, res) => {
  try {
    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).send('Assessment not found.');
    if (assess.finalDecision !== 'hired') return res.status(400).send('Offer letter not available.');

    const pdfBuffer = generateOfferLetterPdf(assess.candidateName, assess.role);
    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).send(err.message || 'Error generating offer letter.');
  }
});

router.post('/api/smart-email/assessments/:id/interview-submit', async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Exactly 5 interview answers are required.' });
    }

    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    if (assess.interviewCompleted) {
      return res.status(400).json({ error: 'Interview already completed.' });
    }

    // AI grading metrics
    let metrics = {
      confidence: 8,
      communication: 8,
      accuracy: 8,
      problemSolving: 8,
      behavior: 8,
      professionalism: 8,
      grammar: 8,
      overallScore: 8
    };
    let feedback = '';

    try {
      const client = getGeminiClient();
      const graderPrompt = `You are a professional hiring manager and engineering director. Grade this candidate's response to 5 technical interview questions for the position of "${assess.role}".

Candidate: ${assess.candidateName}
Role: ${assess.role}
Questions: ${JSON.stringify(assess.interviewQuestions)}
Answers: ${JSON.stringify(answers)}

Evaluate these metrics out of 10:
- confidence: tone, speech clarity, assurance.
- communication: coherence, ease of understanding.
- accuracy: technical correctness of answers.
- problemSolving: coding/analytical approaches.
- behavior: handling scenarios, leadership, collaboration.
- professionalism: standard practices, engineering integrity.
- grammar: structural correctness of phrasing.
- overallScore: overall suitability score (must reflect average).

Also write a 3-4 sentence detailed summary feedback.
Return a JSON object:
{
  "confidence": 8,
  "communication": 8,
  "accuracy": 7,
  "problemSolving": 8,
  "behavior": 9,
  "professionalism": 8,
  "grammar": 9,
  "overallScore": 8,
  "feedback": "..."
}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: graderPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confidence: { type: Type.INTEGER },
              communication: { type: Type.INTEGER },
              accuracy: { type: Type.INTEGER },
              problemSolving: { type: Type.INTEGER },
              behavior: { type: Type.INTEGER },
              professionalism: { type: Type.INTEGER },
              grammar: { type: Type.INTEGER },
              overallScore: { type: Type.INTEGER },
              feedback: { type: Type.STRING }
            },
            required: ['confidence', 'communication', 'accuracy', 'problemSolving', 'behavior', 'professionalism', 'grammar', 'overallScore', 'feedback']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      metrics = {
        confidence: parsed.confidence || 8,
        communication: parsed.communication || 8,
        accuracy: parsed.accuracy || 8,
        problemSolving: parsed.problemSolving || 8,
        behavior: parsed.behavior || 8,
        professionalism: parsed.professionalism || 8,
        grammar: parsed.grammar || 8,
        overallScore: parsed.overallScore || 8
      };
      feedback = parsed.feedback || 'Good job on the technical discussion.';
    } catch (apiErr) {
      console.warn('Gemini evaluation grading error, using defaults:', apiErr);
      feedback = 'Evaluation completed. Standard candidate screening response.';
    }

    const passed = metrics.overallScore >= 7;
    const finalDecision = passed ? 'hired' : 'rejected';

    // Save final state
    assess.interviewCompleted = true;
    assess.interviewCompletedAt = new Date().toISOString();
    assess.interviewAnswers = answers;
    assess.interviewMetrics = metrics;
    assess.finalDecision = finalDecision;

    // Send correspondence via email (Offer letter with PDF attachment OR rejection feedback)
    let subject = '';
    let htmlBody = '';
    let pdfBuffer: Buffer | null = null;

    if (passed) {
      subject = `Official Job Offer: ${assess.role} - SmartDocs AI`;
      htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>We are absolutely thrilled to extend you a formal offer of employment for the position of <strong>${assess.role}</strong> at SmartDocs AI.</p>
<p>You achieved an exceptional score of <strong>${metrics.overallScore}/10</strong> in our final technical interview, demonstrating top-tier capabilities in communication, accuracy, and problem solving.</p>
<p>Please find your formal <strong>Job Offer Letter PDF</strong> attached to this email. We would love to welcome you to our core software operations.</p>
<p>Warm regards,</p>
<p>The Recruitment Board</p>`;

      try {
        pdfBuffer = generateOfferLetterPdf(assess.candidateName, assess.role);
        assess.offerLetterUrl = `/api/smart-email/assessments/${assess.id}/offer-letter`;
      } catch (pdfErr) {
        console.error('Failed to generate jsPDF offer letter:', pdfErr);
      }
    } else {
      subject = `Application Decision: ${assess.role} - SmartDocs AI`;
      htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Thank you for participating in our final round AI Technical Interview for the position of <strong>${assess.role}</strong>.</p>
<p>We appreciated hearing your insights. After compiling scores, your overall rating is <strong>${metrics.overallScore}/10</strong>. Unfortunately, we will not be moving forward with your candidacy at this time.</p>
<p><strong>Constructive Panel Feedback:</strong></p>
<p><em>${feedback}</em></p>
<p>We wish you the very best in your search and encourage you to apply for roles at our firm in the future.</p>`;
      assess.rejectionFeedback = feedback;
    }

    // Dispatch the email
    try {
      const transporter = getEmailTransporter();
      const emailHtml = buildEmailHtml(subject, htmlBody, 'resume', 'Recruitment System');

      const mailOptions: any = {
        from: `"SmartDocs AI Recruitment" <${process.env.GMAIL_USER}>`,
        to: assess.candidateEmail,
        subject: subject,
        html: emailHtml,
        text: htmlBody.replace(/<[^>]*>/g, '')
      };

      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `Job_Offer_Letter_${assess.candidateName.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer
          }
        ];
      }

      await transporter.sendMail(mailOptions);
    } catch (smtpErr: any) {
      console.error('Failed to email interview results:', smtpErr.message);
    }

    await assess.save();

    res.json({ success: true, finalDecision, metrics, feedback });
  } catch (err: any) {
    console.error('Submit interview error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit interview.' });
  }
});

router.get('/api/smart-email/assessments/:id/interview-questions', async (req, res) => {
  try {
    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    if (assess.interviewQuestions && assess.interviewQuestions.length === 5) {
      return res.json({ questions: assess.interviewQuestions });
    }

    // Generate questions via Gemini 2.5
    let questions: string[] = [];
    try {
      const client = getGeminiClient();
      const prompt = `You are an AI Technical Interviewer. Generate exactly 5 dynamic interview questions for candidate ${assess.candidateName} applying for the role of "${assess.role}".

The questions should be based on:
- Candidate Profile Skills: ${assess.profile ? assess.profile.skills.join(', ') : 'standard technical competencies'}
- Candidate Resume/Profile Context
- Screening Quiz Score: ${assess.score || 0}/10

Make the questions highly context-specific, evaluating their depth of knowledge, problem-solving mindset, and engineering decisions. The questions should test their understanding of areas they might have struggled with in the screening quiz.

Return a JSON object with a single key "questions" containing a list of exactly 5 text strings:
{ "questions": ["...", "...", "...", "...", "..."] }`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['questions']
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.questions && parsed.questions.length === 5) {
        questions = parsed.questions;
      }
    } catch (apiErr) {
      console.warn('Gemini interview question generator error, using default questions:', apiErr);
    }

    if (questions.length !== 5) {
      questions = [
        `Can you explain a challenging technical problem you solved in your past projects related to ${assess.role}?`,
        `How do you handle technical debt and code refactoring when working under tight deadlines?`,
        `What is your approach to designing scalability and reliability into a Web application?`,
        `How do you ensure proper security standards (like preventing injection or credentials leak) in your software?`,
        `Why are you interested in this position, and how do your skills align with the requirements of this role?`
      ];
    }

    assess.interviewQuestions = questions;
    await assess.save();

    res.json({ questions });
  } catch (err: any) {
    console.error('Interview questions error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch interview questions.' });
  }
});

router.post('/api/smart-email/assessments/:id/decision', async (req, res) => {
  try {
    const { decision } = req.body; // 'offer' | 'rejection'
    if (!decision || (decision !== 'offer' && decision !== 'rejection')) {
      return res.status(400).json({ error: 'Decision must be either "offer" or "rejection".' });
    }

    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment invite not found.' });

    const doc = await DocumentModel.findById(assess.documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const action = decision === 'offer' ? 'offer_letter' : 'rejection_letter';

    let subject = '';
    let htmlBody = '';

    try {
      const client = getGeminiClient();
      let docContent = doc.content;
      if (doc.type === 'pdf') docContent = `[Resume of ${assess.candidateName}]`;

      // AI drafts the email
      const emailPrompt = `You are a professional HR director. Draft a formal email decision for:
Candidate: ${assess.candidateName}
Action: ${action === 'offer_letter' ? 'Formal Job Offer Letter (congratulatory, role details)' : 'Constructive Rejection Email (polite, thanks, feedback)'}
Role: ${assess.role}
Assessment Score: ${assess.score}/5

Generate HTML body only, using tags like <p>, <ul>, <li>, <strong>, <br>.
Return JSON: { "subject": "...", "htmlBody": "..." }`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: emailPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              htmlBody: { type: Type.STRING }
            },
            required: ['subject', 'htmlBody']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      subject = result.subject;
      htmlBody = result.htmlBody;
    } catch (apiErr: any) {
      console.warn('Gemini API quota exceeded or error drafting decision. Using fallback offline template:', apiErr.message);
      if (decision === 'offer') {
        subject = `Official Job Offer: ${assess.role} - SmartDocs AI`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>We are absolutely thrilled to extend you a formal offer of employment for the position of <strong>${assess.role}</strong>.</p>
<p>Your background, combined with your impressive score of <strong>${assess.score}/5</strong> on our role-play screening assessment, makes you an ideal fit for our team.</p>
<p>Key Offer Details:</p>
<ul>
  <li><strong>Position:</strong> ${assess.role}</li>
  <li><strong>Department:</strong> Engineering & Technical Operations</li>
  <li><strong>Reporting Manager:</strong> Hiring Director</li>
</ul>
<p>We believe your skills will make a significant impact here. Please review and reply to this email to confirm your acceptance of this offer.</p>
<p>Congratulations, and welcome to our team!</p>`;
      } else {
        subject = `Application Update: ${assess.role} - SmartDocs AI`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Thank you for taking the time to meet with us and complete our role suitability assessment for the <strong>${assess.role}</strong> position.</p>
<p>We appreciate the effort you put into the process. After reviewing your evaluation score of <strong>${assess.score}/5</strong>, we regret to inform you that we will not be moving forward with your application at this time.</p>
<p>We encourage you to apply for future roles that align with your profile, and we wish you the very best in your job search.</p>
<p>Sincerely,</p>
<p>Recruitment Team</p>`;
      }
    }

    // Deliver email
    const transporter = getEmailTransporter();
    const fullHtml = buildEmailHtml(subject, htmlBody, 'resume', 'Human Resources');

    await transporter.sendMail({
      from: `"HR Department" <${process.env.GMAIL_USER}>`,
      to: assess.candidateEmail,
      subject: subject,
      html: fullHtml,
      text: htmlBody.replace(/<[^>]*>/g, '')
    });

    // Save history
    const historyEntry: SmartEmailHistoryEntry = {
      id: 'semail_' + Math.random().toString(36).substring(2, 11),
      documentId: assess.documentId,
      documentTitle: doc.title,
      category: 'resume',
      action: action,
      recipientName: assess.candidateName,
      recipientEmail: assess.candidateEmail,
      subject: subject,
      tone: 'formal',
      sentAt: new Date().toISOString(),
      status: 'success'
    };

    await SmartEmailHistoryModel.create(historyEntry);
    assess.decisionSent = decision;
    await assess.save();

    res.json({ success: true, entry: historyEntry });
  } catch (err: any) {
    console.error('Send decision invite error:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch decision letter.' });
  }
});

router.post('/api/smart-email/assessments/:id/submit', async (req, res) => {
  try {
    const { answers, candidateSkills, cheatAttemptsCount } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required.' });
    }

    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    if (assess.completed) return res.status(400).json({ error: 'Assessment already completed.' });

    // Calculate score
    let score = 0;
    assess.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      }
    });

    const doc = await DocumentModel.findById(assess.documentId);
    const docTitle = doc ? doc.title : 'Unknown Document';
    const totalQuestions = assess.questions.length;
    const passingThreshold = 8; // Passing score threshold is 8 out of 10 (80%)
    const passed = score >= passingThreshold;
    const decision = passed ? 'interview_invite' : 'rejection';

    let subject = '';
    let htmlBody = '';

    try {
      const client = getGeminiClient();
      let docContent = doc ? doc.content : '';
      if (doc && doc.type === 'pdf') {
        docContent = `[Resume / Profile of ${assess.candidateName}]`;
      } else if (docContent.length > 5000) {
        docContent = docContent.substring(0, 5000);
      }

      if (passed) {
        const invitePrompt = `You are a friendly enterprise recruiter. Draft an invitation email to ${assess.candidateName} for an AI Interview.
They scored ${score}/10 on their initial suitability screening for the ${assess.role} role.
Highlight that they cleared the threshold, and we are inviting them to the next stage: a 5-question AI Voice/Text Interview.
Keep the email structured in clean HTML format. Use tags like <p>, <ul>, <li>, <strong>. No html/body wrappers.`;

        const response = await client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: invitePrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                htmlBody: { type: Type.STRING }
              },
              required: ['subject', 'htmlBody']
            }
          }
        });
        const result = JSON.parse(response.text || '{}');
        subject = result.subject || `Congratulations! Proceed to AI Interview for ${assess.role}`;
        htmlBody = result.htmlBody || `<p>Congratulations on clearing the screening assessment!</p>`;
      } else {
        const rejectPrompt = `You are an empathetic HR partner. Draft a constructive rejection email to ${assess.candidateName} for the ${assess.role} role.
They scored ${score}/10 on their suitability screening, which is below our 8/10 threshold.
Highlight:
- Specific constructive feedback based on the role and skills: ${candidateSkills || 'technical concepts'}.
- Provide 3 helpful educational resources (with placeholders or generalized topics like FreeCodeCamp, MDN Web Docs, system design guides) to improve their skills.
Keep the email structured in clean HTML format. Use tags like <p>, <ul>, <li>, <strong>. No html/body wrappers.`;

        const response = await client.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: rejectPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                htmlBody: { type: Type.STRING }
              },
              required: ['subject', 'htmlBody']
            }
          }
        });
        const result = JSON.parse(response.text || '{}');
        subject = result.subject || `Application Update: ${assess.role} - SmartDocs AI`;
        htmlBody = result.htmlBody || `<p>Thank you for completing the suitability assessment. Unfortunately, we will not be moving forward.</p>`;
      }
    } catch (apiErr: any) {
      console.warn('Gemini auto-decision API error. Fallback to offline template:', apiErr.message);
      if (passed) {
        subject = `Action Required: AI Interview Invitation - ${assess.role}`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Congratulations! You scored <strong>${score}/10</strong> on the suitability screening quiz, meeting our passing threshold.</p>
<p>We are pleased to invite you to the next stage of our recruitment process: the <strong>AI Voice/Text Interview</strong>.</p>
<p>Please log back into the candidate portal to launch your automated interview.</p>`;
      } else {
        subject = `Application Update: ${assess.role} - SmartDocs AI`;
        htmlBody = `<p>Dear ${assess.candidateName},</p>
<p>Thank you for taking the time to complete our screening assessment.</p>
<p>You scored <strong>${score}/10</strong>. Unfortunately, this does not meet our required score of 8/10 to proceed to the next stage.</p>
<p>We encourage you to review standard engineering frameworks, system design resources on MDN Web Docs, and coding guides on FreeCodeCamp. We wish you the best in your search.</p>`;
      }
    }

    // Add interview link to email body if passed
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const interviewLink = `${appUrl}/?assessId=${assess.id}&phase=interview`;
    if (passed) {
      htmlBody += `<div style="margin: 24px 0; text-align: center;">
        <a href="${interviewLink}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Start AI Interview Now</a>
      </div>
      <p style="font-size:11px;color:#94a3b8;">If the button above does not work, copy and paste this link in your browser:<br>${interviewLink}</p>`;
    }

    // Deliver email via Gmail SMTP
    try {
      const transporter = getEmailTransporter();
      const fullHtml = buildEmailHtml(subject, htmlBody, 'resume', 'Recruitment System');

      await transporter.sendMail({
        from: `"SmartDocs AI Recruitment" <${process.env.GMAIL_USER}>`,
        to: assess.candidateEmail,
        subject: subject,
        html: fullHtml,
        text: htmlBody.replace(/<[^>]*>/g, '')
      });
    } catch (smtpErr: any) {
      console.error('Failed to automatically send decision email via SMTP:', smtpErr.message);
    }

    // Save history entry
    const historyEntry: SmartEmailHistoryEntry = {
      id: 'semail_' + Math.random().toString(36).substring(2, 11),
      documentId: assess.documentId,
      documentTitle: docTitle,
      category: 'resume',
      action: passed ? 'offer_letter' : 'rejection_letter', // Map to categories for styling/icons
      recipientName: assess.candidateName,
      recipientEmail: assess.candidateEmail,
      subject: subject,
      tone: 'formal',
      sentAt: new Date().toISOString(),
      status: 'success'
    };
    await SmartEmailHistoryModel.create(historyEntry);

    // Save database updates
    assess.completed = true;
    assess.score = score;
    assess.candidateSkills = candidateSkills || '';
    assess.completedAt = new Date().toISOString();
    assess.decisionSent = passed ? null : 'rejection';
    assess.finalDecision = passed ? 'pending' : 'rejected';
    assess.interviewInvited = passed;
    assess.cheatAttemptsCount = cheatAttemptsCount || assess.cheatAttemptsCount || 0;
    await assess.save();

    res.json({ success: true, score, decision, passed, interviewInvited: passed });
  } catch (err: any) {
    console.error('Candidate quiz submit error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit quiz responses.' });
  }
});

router.post('/api/smart-email/assessments/:id/telemetry', async (req, res) => {
  try {
    const { timeRemaining, cheatAttemptsCount } = req.body;
    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    if (timeRemaining !== undefined) {
      assess.timeRemaining = timeRemaining;
    }
    if (cheatAttemptsCount !== undefined) {
      assess.cheatAttemptsCount = cheatAttemptsCount;
    }
    await assess.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/smart-email/assessments/:id', async (req, res) => {
  try {
    const assess = await CandidateAssessmentModel.findById(req.params.id);
    if (!assess) return res.status(404).json({ error: 'Assessment not found.' });

    // Format questions without answers to protect candidate evaluation
    const publicQuestions = assess.questions.map(q => ({
      question: q.question,
      options: q.options
    }));

    res.json({
      id: assess.id,
      candidateName: assess.candidateName,
      candidateEmail: assess.candidateEmail,
      role: assess.role,
      completed: assess.completed,
      score: assess.score,
      decisionSent: assess.decisionSent,
      candidateSkills: assess.candidateSkills,
      questions: publicQuestions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/smart-email/assessments', async (req, res) => {
  try {
    const { documentId } = req.query;
    let invites;
    if (documentId) {
      invites = await CandidateAssessmentModel.find({ documentId: documentId as string });
    } else {
      invites = await CandidateAssessmentModel.find({});
    }
    res.json(invites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/smart-email/assessments', async (req, res) => {
  try {
    const { documentId, candidateName, candidateEmail, role, jobDescription, difficulty } = req.body;
    if (!documentId || !candidateName || !candidateEmail || !role) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Step 2a: Get candidate profile (or auto-extract if not already present)
    let profile = doc.candidateProfile;
    if (!profile) {
      try {
        profile = await extractCandidateProfile(doc);
        doc.candidateProfile = profile;
        await doc.save();
      } catch (errProfile) {
        console.warn('Failed to parse candidate profile on invite, using fallback:', errProfile);
        profile = {
          name: candidateName,
          email: candidateEmail,
          phone: 'Not Provided',
          skills: [role],
          experience: 'Relevant experience detailed in resume.',
          education: 'Academic education detailed in resume.',
          projects: 'Projects detailed in resume.',
          certifications: 'Certifications detailed in resume.'
        };
      }
    }

    // Step 2b: Compare Resume vs JD Analysis
    const jd = jobDescription || `Position for ${role} requiring relevant technical background, problem solving, and professional development practices.`;
    let analysis: ResumeAnalysis;
    try {
      const client = getGeminiClient();
      const analysisPrompt = `You are a professional HR director and resume evaluator. Compare the candidate's resume profile against the Job Description (JD) for the role: "${role}".

CANDIDATE PROFILE:
- Skills: ${profile.skills.join(', ')}
- Experience: ${profile.experience}
- Education: ${profile.education}
- Projects: ${profile.projects}
- Certifications: ${profile.certifications}

JOB DESCRIPTION:
"${jd}"

Analyze:
1. Match Percentage (0-100) based on alignment of skills, experience, and requirements.
2. Skill Gap: list specific technologies or capabilities that are required but the candidate lacks or has weak experience in.
3. Missing Skills: specific technologies/skills explicitly in the JD but not found in the resume.
4. Strengths: key matching areas and positive qualifications.
5. Weaknesses: potential issues, lack of depth in certain areas.
6. Recommendation: a summary recommendation (e.g. Hire, Interview, Reject) with quick justification.
7. Overall Score: out of 10.

Return JSON matching this schema:
{
  "matchPercentage": 85,
  "skillGap": ["React Native", "Swift"],
  "missingSkills": ["React Native"],
  "strengths": ["Strong Node.js background", "TypeScript expertise"],
  "weaknesses": ["No mobile development experience listed"],
  "recommendation": "Invite for interview. Very strong backend skills.",
  "overallScore": 8
}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchPercentage: { type: Type.INTEGER },
              skillGap: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendation: { type: Type.STRING },
              overallScore: { type: Type.INTEGER }
            },
            required: ['matchPercentage', 'skillGap', 'missingSkills', 'strengths', 'weaknesses', 'recommendation', 'overallScore']
          }
        }
      });

      analysis = JSON.parse(response.text || '{}');
    } catch (errAnalysis) {
      console.warn('Failed to run resume vs JD analysis, using fallback:', errAnalysis);
      analysis = {
        matchPercentage: 70,
        skillGap: ['None detected'],
        missingSkills: [],
        strengths: ['Relevant background matching role requirements'],
        weaknesses: ['Underspecified details'],
        recommendation: 'Evaluate further via screening assessment.',
        overallScore: 7
      };
    }

    // Step 3: Generate Dynamic Quiz questions based on JD, Role, and Resume
    let questions: CandidateQuizQuestion[] = [];
    const difficultyLevel = difficulty || 'medium';

    try {
      const client = getGeminiClient();
      const quizPrompt = `You are an expert technical interviewer and exam developer.
Analyze the candidate's resume/profile, the Job Description (JD), and the target position: "${role}" at a "${difficultyLevel}" difficulty level.
Generate exactly 10 multiple-choice questions (MCQs) for the candidate.

The quiz must include a mix of:
- Technical Questions (testing candidate's claimed skills: ${profile.skills.slice(0, 5).join(', ')})
- Logical Reasoning / Problem Solving questions
- Coding / Technical scenario questions
- Soft Skills / situational judgment questions

Each question must contain:
1. question: clear text of the question.
2. options: exactly 4 plausible choices (e.g. "A. ...", "B. ...", "C. ...", "D. ...").
3. correctAnswer: 0-indexed number of the correct option (0=A, 1=B, 2=C, 3=D).
4. explanation: a short constructive paragraph explaining why the correct option is right.

Return a JSON array of exactly 10 objects:
[{ "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": 0, "explanation": "..." }]`;

      let contents: any;
      if (doc.type === 'pdf') {
        contents = [{ inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } }, quizPrompt];
      } else {
        contents = `${quizPrompt}\n\nDOCUMENT CONTENT:\n${(await fetchBlobAsText(doc.content)).substring(0, 6000)}`;
      }

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ['question', 'options', 'correctAnswer', 'explanation']
            }
          }
        }
      });

      questions = JSON.parse(response.text || '[]');
      if (questions.length < 10) {
        const fallbacks = getFallbackAssessmentQuestions(role);
        while (questions.length < 10 && fallbacks.length > 0) {
          questions.push(fallbacks[questions.length % fallbacks.length]);
        }
      }
    } catch (apiErr: any) {
      console.warn('Gemini quiz generation error. Using high-quality fallback questions:', apiErr.message);
      questions = getFallbackAssessmentQuestions(role);
    }

    // Ensure questions are randomized slightly to fit the attempt
    questions = questions.sort(() => Math.random() - 0.5).slice(0, 10);

    const assessmentId = 'assess_' + Math.random().toString(36).substring(2, 11);

    const newAssessment: CandidateAssessment = {
      id: assessmentId,
      documentId,
      candidateName,
      candidateEmail,
      role,
      jobDescription: jd,
      questions,
      completed: false,
      profile,
      analysis,
      cheatAttemptsCount: 0
    };

    // Save invite to DB
    const createdAssessment = await CandidateAssessmentModel.create(newAssessment);

    // Send invite email
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const assessmentLink = `${appUrl}/?assessId=${createdAssessment.id}`;
    const expiryTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    await sendAssessmentInviteEmail(candidateEmail, candidateName, role, assessmentLink, expiryTime);

    res.json({ success: true, assessmentId: createdAssessment.id, analysis });
  } catch (err: any) {
    console.error('Create assessment invite error:', err);
    res.status(500).json({ error: err.message || 'Failed to dispatch invite.' });
  }
});

router.post('/api/smart-email/regenerate', async (req, res) => {
  try {
    const { documentId, recipientName, recipientEmail, tone, action, category, additionalInstructions } = req.body;
    if (!documentId || !recipientEmail) {
      return res.status(400).json({ error: 'Missing documentId or recipientEmail.' });
    }

    // Re-use the analyze endpoint logic with additional instructions
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const client = getGeminiClient();
    const emailTone: SmartEmailTone = tone || 'formal';
    const recipient = recipientName || 'Recipient';
    const emailCategory: SmartEmailCategory = category || 'general';
    const emailAction: SmartEmailAction = action || 'general_response';

    let docContent = doc.content;
    if (doc.type === 'pdf') {
      docContent = `[PDF Document: ${doc.title}]`;
    }
    if (docContent.length > 8000) {
      docContent = docContent.substring(0, 8000);
    }

    const toneGuide: Record<string, string> = {
      formal: 'Use a highly professional, corporate tone. Address the recipient formally.',
      friendly: 'Use a warm but professional tone. Be approachable while maintaining professionalism.',
      strict: 'Use a direct, authoritative, no-nonsense tone. Be concise and firm.'
    };

    const regenPrompt = `You are a professional business email writer.

DOCUMENT: "${doc.title}" (${doc.type})
CONTENT: ${docContent}

Generate a ${emailAction.replace(/_/g, ' ')} email for this ${emailCategory.replace(/_/g, ' ')} document.
RECIPIENT: ${recipient}
TONE: ${toneGuide[emailTone]}
${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ''}

Generate the email body in clean HTML using <p>, <ul>, <li>, <strong>, <em>, <h3>, <br> tags.
No html/body wrappers — just inner content.
Make it professional and realistic.

Return JSON: {"subject": "...", "htmlBody": "...", "plainPreview": "..."}`;

    let regenContents: any;
    if (doc.type === 'pdf') {
      regenContents = [
        { inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } },
        regenPrompt
      ];
    } else {
      regenContents = regenPrompt;
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: regenContents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            htmlBody: { type: Type.STRING },
            plainPreview: { type: Type.STRING }
          },
          required: ['subject', 'htmlBody', 'plainPreview']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');

    const draft: SmartEmailDraft = {
      id: 'draft_' + Math.random().toString(36).substring(2, 11),
      documentId: doc.id,
      category: emailCategory,
      action: emailAction,
      tone: emailTone,
      recipientName: recipient,
      recipientEmail,
      subject: result.subject || `Re: ${doc.title}`,
      htmlBody: result.htmlBody || '<p>Failed to regenerate email content.</p>',
      plainPreview: result.plainPreview || 'Regenerated email based on your document.',
      confidence: 0.85,
      generatedAt: new Date().toISOString()
    };

    res.json(draft);
  } catch (err: any) {
    console.error('Smart email regenerate error:', err);
    res.status(500).json({ error: err.message || 'Failed to regenerate email.' });
  }
});

router.get('/api/smart-email/templates', (req, res) => {
  try {
    const templates = [
      {
        category: 'resume',
        label: 'Resume / CV',
        description: 'Analyze candidate resumes and generate HR correspondence',
        icon: '👤',
        color: '#7c3aed',
        actions: getCategoryActions('resume')
      },
      {
        category: 'assignment',
        label: 'Assignment',
        description: 'Solve assignments and send answers professionally',
        icon: '📝',
        color: '#0ea5e9',
        actions: getCategoryActions('assignment')
      },
      {
        category: 'question_bank',
        label: 'Question Bank',
        description: 'Generate comprehensive answer keys for exam papers',
        icon: '❓',
        color: '#f59e0b',
        actions: getCategoryActions('question_bank')
      },
      {
        category: 'business_report',
        label: 'Business Report',
        description: 'Create executive summary emails from reports',
        icon: '📊',
        color: '#10b981',
        actions: getCategoryActions('business_report')
      },
      {
        category: 'invoice',
        label: 'Invoice / Receipt',
        description: 'Generate payment confirmations and reminders',
        icon: '💳',
        color: '#ef4444',
        actions: getCategoryActions('invoice')
      },
      {
        category: 'legal_contract',
        label: 'Legal / Contract',
        description: 'Summarize contracts and highlight key clauses',
        icon: '⚖️',
        color: '#6366f1',
        actions: getCategoryActions('legal_contract')
      },
      {
        category: 'cover_letter',
        label: 'Cover Letter',
        description: 'Acknowledge applications and send HR responses',
        icon: '✉️',
        color: '#ec4899',
        actions: getCategoryActions('cover_letter')
      },
      {
        category: 'general',
        label: 'General Document',
        description: 'Generate professional response for any document',
        icon: '📄',
        color: '#8b5cf6',
        actions: getCategoryActions('general')
      }
    ];
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/smart-email/history', async (req, res) => {
  try {
    const history = await SmartEmailHistoryModel.find({}).sort({ sentAt: -1 });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/smart-email/send', async (req, res) => {
  try {
    const { recipientEmail, recipientName, subject, htmlBody, documentId, category, action, tone } = req.body;
    if (!recipientEmail || !subject || !htmlBody || !documentId) {
      return res.status(400).json({ error: 'Missing required fields: recipientEmail, subject, htmlBody, documentId.' });
    }

    const doc = await DocumentModel.findById(documentId);
    const docTitle = doc ? doc.title : 'Unknown Document';
    const senderName = 'SmartDocs AI';

    // Build the full HTML email with template
    const fullHtml = buildEmailHtml(subject, htmlBody, category || 'general', senderName);

    // Send via Gmail SMTP
    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from: `"SmartDocs AI" <${process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: subject,
      html: fullHtml,
      text: htmlBody.replace(/<[^>]*>/g, '') // Strip HTML for plain text fallback
    });

    // Log to history
    const historyEntry: SmartEmailHistoryEntry = {
      id: 'semail_' + Math.random().toString(36).substring(2, 11),
      documentId,
      documentTitle: docTitle,
      category: category || 'general',
      action: action || 'general_response',
      recipientName: recipientName || 'Recipient',
      recipientEmail,
      subject,
      tone: tone || 'formal',
      sentAt: new Date().toISOString(),
      status: 'success'
    };

    await SmartEmailHistoryModel.create(historyEntry);

    res.json({ success: true, entry: historyEntry });
  } catch (err: any) {
    console.error('Smart email send error:', err);

    // Log failure
    try {
      const failEntry: SmartEmailHistoryEntry = {
        id: 'semail_' + Math.random().toString(36).substring(2, 11),
        documentId: req.body.documentId || '',
        documentTitle: 'Unknown',
        category: req.body.category || 'general',
        action: req.body.action || 'general_response',
        recipientName: req.body.recipientName || 'Recipient',
        recipientEmail: req.body.recipientEmail || '',
        subject: req.body.subject || '',
        tone: req.body.tone || 'formal',
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: err.message
      };
      await SmartEmailHistoryModel.create(failEntry);
    } catch (logErr) {
      console.error('Failed to log email failure:', logErr);
    }

    res.status(500).json({ error: err.message || 'Failed to send email.' });
  }
});

router.post('/api/smart-email/analyze', async (req, res) => {
  try {
    const { documentId, recipientName, recipientEmail, tone, action: requestedAction, category: requestedCategory } = req.body;
    if (!documentId || !recipientEmail) {
      return res.status(400).json({ error: 'Missing documentId or recipientEmail.' });
    }

    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const client = getGeminiClient();
    const emailTone: SmartEmailTone = tone || 'formal';
    const recipient = recipientName || 'Recipient';

    // Get document content for analysis
    let docContent = doc.content;
    if (doc.type === 'pdf') {
      docContent = `[PDF Document: ${doc.title}]`;
    }
    if (docContent.length > 8000) {
      docContent = docContent.substring(0, 8000);
    }

    // Step 1: Detect document category (or use provided)
    let detectedCategory: SmartEmailCategory = requestedCategory || 'general';
    let confidence = 0.9;

    if (!requestedCategory) {
      const categoryPrompt = `Analyze this document and classify it into ONE of these categories:
- resume (CV, resume, candidate profile, job application)
- assignment (homework, student work, coursework, lab reports)
- question_bank (exam paper, test questions, MCQ set, quiz paper)
- business_report (quarterly report, financial analysis, proposal, presentation)
- invoice (bill, receipt, payment document, purchase order)
- legal_contract (contract, agreement, terms, NDA, MOU)
- cover_letter (application letter, motivation letter)
- general (anything else)

Document Title: "${doc.title}"
Document Type: ${doc.type}
Content Preview: "${docContent.substring(0, 2000)}"

Return JSON with "category" and "confidence" (0-1 score).`;

      let contents: any;
      if (doc.type === 'pdf') {
        contents = [
          { inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } },
          categoryPrompt
        ];
      } else {
        contents = categoryPrompt;
      }

      const catResponse = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['category', 'confidence']
          }
        }
      });

      const catResult = JSON.parse(catResponse.text || '{}');
      if (catResult.category) {
        const validCategories: SmartEmailCategory[] = ['resume', 'assignment', 'question_bank', 'business_report', 'invoice', 'legal_contract', 'cover_letter', 'general'];
        const matched = validCategories.find(c => c === catResult.category.toLowerCase().replace(/\s+/g, '_'));
        if (matched) detectedCategory = matched;
      }
      if (catResult.confidence) confidence = catResult.confidence;
    }

    // Step 2: Determine email action
    const availableActions = getCategoryActions(detectedCategory);
    let selectedAction: SmartEmailAction = requestedAction || availableActions[0].action;

    // Step 3: Generate the formal email using Gemini
    const toneGuide = {
      formal: 'Use a highly professional, corporate tone. Address the recipient formally. Use proper salutations and closings.',
      friendly: 'Use a warm but professional tone. Be approachable while maintaining professionalism.',
      strict: 'Use a direct, authoritative, no-nonsense tone. Be concise and firm.'
    };

    const actionPrompts: Record<SmartEmailAction, string> = {
      offer_letter: `Generate a professional HR Offer Letter email for the candidate whose resume is in the document. Include:
- Congratulatory opening
- Position title (infer from resume/role fit)
- Key terms (start date placeholder, compensation placeholder)
- Next steps and onboarding info
- Professional closing`,
      rejection_letter: `Generate a professional, empathetic HR Rejection Letter for the candidate whose resume is in the document. Include:
- Appreciation for their application
- Professional and kind rejection notice
- Constructive feedback or encouragement
- Wish them well for future endeavors`,
      assignment_answers: `Analyze this assignment document and generate a comprehensive answer email containing:
- Complete solutions for each question/problem in the assignment
- Clear step-by-step explanations
- Final answers highlighted
- Professional formatting`,
      answer_key: `Analyze this question bank/exam paper and generate a comprehensive answer key email containing:
- Answers for every question in the document
- Detailed explanations for each answer
- Key concepts referenced
- Professional academic formatting`,
      executive_summary: `Analyze this business report and generate an executive summary email containing:
- High-level overview of key findings
- Critical data points and metrics
- Recommendations and action items
- Strategic implications`,
      payment_reminder: `Analyze this invoice/billing document and generate a professional payment email containing:
- Reference to the invoice details (number, amount, date)
- Payment status acknowledgment or gentle reminder
- Payment instructions or confirmation
- Professional financial correspondence tone`,
      contract_review: `Analyze this legal document and generate a contract review summary email containing:
- Key clauses and their implications
- Important obligations for each party
- Risk areas or concerns
- Recommended next steps`,
      acknowledgment: `Based on this cover letter/application, generate a formal application acknowledgment email containing:
- Confirmation of receipt
- Brief overview of the review process
- Expected timeline
- Professional HR closing`,
      general_response: `Analyze this document and generate a professional response email containing:
- Key points from the document
- Relevant action items
- Professional analysis
- Clear next steps`
    };

    const emailGenPrompt = `You are a professional business email writer at an enterprise level.

DOCUMENT CONTENT:
---
Title: ${doc.title}
Type: ${doc.type}
Content: ${docContent}
---

TASK: ${actionPrompts[selectedAction]}

RECIPIENT NAME: ${recipient}
TONE: ${toneGuide[emailTone]}

Generate the email body in clean HTML format suitable for embedding in an email template.
Use <p>, <ul>, <li>, <strong>, <em>, <h3>, <br> tags for formatting.
Do NOT include <html>, <head>, <body>, or <style> tags — just the inner body content.
Make it look like a real corporate email that an HR manager, professor, or business executive would send.

Also generate:
- A professional email subject line
- A 1-2 line plain text preview

Return as JSON with keys: "subject", "htmlBody", "plainPreview"`;

    let emailContents: any;
    if (doc.type === 'pdf') {
      emailContents = [
        { inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } },
        emailGenPrompt
      ];
    } else {
      emailContents = emailGenPrompt;
    }

    const emailResponse = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: emailContents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            htmlBody: { type: Type.STRING },
            plainPreview: { type: Type.STRING }
          },
          required: ['subject', 'htmlBody', 'plainPreview']
        }
      }
    });

    const emailResult = JSON.parse(emailResponse.text || '{}');

    const draft: SmartEmailDraft = {
      id: 'draft_' + Math.random().toString(36).substring(2, 11),
      documentId: doc.id,
      category: detectedCategory,
      action: selectedAction,
      tone: emailTone,
      recipientName: recipient,
      recipientEmail,
      subject: emailResult.subject || `Re: ${doc.title}`,
      htmlBody: emailResult.htmlBody,
      plainPreview: emailResult.plainPreview || 'AI-generated email based on your document.',
      confidence,
      generatedAt: new Date().toISOString()
    };

    res.json(draft);
  } catch (err: any) {
    console.error('Smart email analyze error, using local fallback draft:', err);
    // Offline fallback for draft generation
    const doc = await DocumentModel.findById(req.body.documentId);
    const docTitle = doc ? doc.title : 'Selected Document';
    const emailTone: SmartEmailTone = req.body.tone || 'formal';
    const recipient = req.body.recipientName || 'Recipient';
    const recipientEmail = req.body.recipientEmail || '';
    const detectedCategory = req.body.category || 'general';
    const selectedAction = req.body.action || 'general_response';

    const fallbackDraft: SmartEmailDraft = {
      id: 'draft_' + Math.random().toString(36).substring(2, 11),
      documentId: req.body.documentId,
      category: detectedCategory,
      action: selectedAction,
      tone: emailTone,
      recipientName: recipient,
      recipientEmail,
      subject: `Correspondence regarding: ${docTitle}`,
      htmlBody: `<p>Dear ${recipient},</p>
<p>This is a formal communication regarding the document: <strong>${docTitle}</strong>.</p>
<p>We have reviewed the document details and are processing the next steps. Please feel free to reach out if you have any questions or require additional information.</p>`,
      plainPreview: `Formal correspondence regarding ${docTitle}`,
      confidence: 0.65,
      generatedAt: new Date().toISOString()
    };
    res.json(fallbackDraft);
  }
});

router.post('/api/smart-email/answer-key', async (req, res) => {
  try {
    const { documentId, recipientEmail } = req.body;
    if (!documentId) return res.status(400).json({ error: 'Missing documentId.' });

    const doc = await DocumentModel.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const client = getGeminiClient();

    const prompt = `You are an expert educator. Analyze this question bank / exam paper and generate complete, highly detailed answers.
Extract EVERY question in the document.
For each question, provide:
- The question text
- The correct detailed answer
- A short constructive explanation

Return your answer strictly in structured JSON format conforming to this schema:
{
  "subject": "Answer Key Subject Line",
  "questions": [
    {
      "question": "Question text here",
      "answer": "Correct answer here",
      "explanation": "Brief explanation here"
    }
  ]
}`;

    let contents: any;
    if (doc.type === 'pdf') {
      contents = [{ inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } }, prompt];
    } else {
      contents = `${prompt}\n\nQUESTION BANK CONTENT:\n${(await fetchBlobAsText(doc.content)).substring(0, 8000)}`;
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['question', 'answer', 'explanation']
              }
            }
          },
          required: ['subject', 'questions']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const questionsList = result.questions || [];

    // Cache the answers on the document
    doc.answerKeyQuestions = questionsList;
    doc.answerKeySubject = result.subject;
    await doc.save();

    // Compile beautiful Answer Key PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = generateAnswerKeyPdf(doc.title, questionsList);
    } catch (pdfErr) {
      console.error('Failed to generate Answer Key PDF:', pdfErr);
    }

    // Auto-email Answer PDF
    // Assuming emailConfig is part of SettingsModel or a global constant
    // For now, hardcoding defaultRecipient as it was in original loadDb() context
    const defaultRecipient = process.env.DEFAULT_EMAIL_RECIPIENT || 'mprakash20007@gmail.com';
    const targetEmail = recipientEmail || defaultRecipient;
    const emailSubject = result.subject || `Answer Key: ${doc.title}`;
    const emailHtmlBody = `
      <div style="background-color: #1e1b4b; border: 1px solid #f59e0b33; border-radius: 12px; padding: 24px; color: #ffffff;">
        <h2 style="color: #f59e0b; margin-top: 0;">SmartDocs AI Exam Assistant</h2>
        <p>We have successfully processed your uploaded Question Bank: <strong>${doc.title}</strong>.</p>
        <p>Our academic AI engine has compiled detailed solutions and explanations. The complete <strong>Answer Key PDF</strong> is attached to this email.</p>
        <p>You can also download this file directly from your SmartDocs workspace dashboard at any time.</p>
        <p>Sincerely,</p>
        <p>The SmartDocs Academic Operations</p>
      </div>
    `;

    try {
      const transporter = getEmailTransporter();
      const fullHtml = buildEmailHtml(emailSubject, emailHtmlBody, 'question_bank', 'SmartDocs AI Academic System');

      const mailOptions: any = {
        from: `"SmartDocs AI Academic" <${process.env.GMAIL_USER}>`,
        to: targetEmail,
        subject: emailSubject,
        html: fullHtml,
        text: `Answer Key for ${doc.title} compiled successfully. Find PDF attached.`
      };

      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `Answer_Key_${doc.title.replace(/\s+/g, '_')}.pdf`,
            content: pdfBuffer
          }
        ];
      }

      await transporter.sendMail(mailOptions);
      console.log(`Auto-sent answer key email to ${targetEmail}`);
    } catch (smtpErr: any) {
      console.error('Failed to auto-send Answer Key email:', smtpErr.message);
    }

    // Return HTML-formatted response for frontend UI rendering
    let answerKeyHtml = `<h2>${emailSubject}</h2>`;
    questionsList.forEach((q: any, idx: number) => {
      answerKeyHtml += `
        <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
          <h3 style="color: #f59e0b; font-size: 14px;">Question ${idx + 1}: ${q.question}</h3>
          <p style="margin: 5px 0;"><strong>Answer:</strong> ${q.answer}</p>
          <p style="margin: 5px 0; font-size: 12px; color: #94a3b8;"><em>Explanation:</em> ${q.explanation}</p>
        </div>
      `;
    });

    res.json({
      subject: emailSubject,
      answerKeyHtml,
      questions: questionsList
    });
  } catch (err: any) {
    console.error('Answer key error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/smart-email/resume-quiz', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'Missing documentId.' });

    const doc = await DocumentModel.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const client = getGeminiClient();

    const prompt = `You are an expert HR interviewer. Analyze this resume and generate 5 role-specific interview questions to assess the candidate's suitability.

Each question must:
- Be directly relevant to skills/experience listed in the resume
- Test practical knowledge of the candidate's claimed expertise
- Have 4 multiple choice options (A, B, C, D)
- Have one clearly correct answer
- Include a brief explanation why that answer is correct

Return JSON array of 5 questions:
[{ "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": 0, "explanation": "..." }]
correctAnswer is 0-indexed (0=A, 1=B, 2=C, 3=D).`;

    let contents: any;
    if (doc.type === 'pdf') {
      contents = [{ inlineData: { mimeType: 'application/pdf', data: await fetchBlobAsBase64(doc.content) } }, prompt];
    } else {
      contents = `${prompt}\n\nRESUME CONTENT:\n${(await fetchBlobAsText(doc.content)).substring(0, 6000)}`;
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      }
    });

    const questions = JSON.parse(response.text || '[]');
    res.json({ questions });
  } catch (err: any) {
    console.error('Resume quiz error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/smart-email/detect', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ error: 'Missing documentId.' });

    const doc = await DocumentModel.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const client = getGeminiClient();
    let snippet = doc.content;
    if (doc.type === 'pdf') snippet = `PDF titled: ${doc.title}`;
    if (snippet.length > 3000) snippet = snippet.substring(0, 3000);

    const prompt = `Classify this document into ONE category:
resume | assignment | question_bank | business_report | invoice | legal_contract | cover_letter | general

Title: "${doc.title}"
Type: ${doc.type}
Content: "${snippet}"

Also extract: candidate name (if resume), role/subject (inferred), and a 1-sentence description of what the document is.
Return JSON: { "category": "...", "confidence": 0-1, "candidateName": "...", "roleOrSubject": "...", "documentDescription": "..." }`;

    const contents = prompt;
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            candidateName: { type: Type.STRING },
            roleOrSubject: { type: Type.STRING },
            documentDescription: { type: Type.STRING }
          },
          required: ['category', 'confidence', 'documentDescription']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const validCategories = ['resume', 'assignment', 'question_bank', 'business_report', 'invoice', 'legal_contract', 'cover_letter', 'general'];
    if (!validCategories.includes(result.category)) result.category = 'general';

    // If it's a resume, perform ATS candidate profile extraction
    if (result.category === 'resume') {
      try {
        console.log('Resume detected. Extracting candidate profile details...');
        const profile = await extractCandidateProfile(doc);
        doc.candidateProfile = profile;

        // Save matching details in result
        result.candidateName = profile.name;
        result.candidateEmail = profile.email;
        if (profile.skills && profile.skills.length > 0) {
          result.roleOrSubject = profile.skills.slice(0, 3).join(', ');
        }

        await doc.save();
      } catch (errProfile) {
        console.error('Failed to auto-extract resume profile:', errProfile);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('Detect error, using local fallback heuristics:', err);
    const doc = await DocumentModel.findById(req.body.documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    let fallbackCategory = 'general';
    let docDescription = `Document workspace for ${doc.title}`;
    let candidateName = '';
    let roleOrSubject = '';

    const lowerTitle = (doc.title || '').toLowerCase();
    const lowerContent = (doc.content || '').toLowerCase();

    if (lowerTitle.includes('resume') || lowerTitle.includes('cv') || lowerContent.includes('resume') || lowerContent.includes('education') || lowerContent.includes('experience')) {
      fallbackCategory = 'resume';
      docDescription = 'Candidate Resume / Curriculum Vitae';
      if (lowerTitle.includes('resume')) {
        candidateName = doc.title.split('_')[0].split('-')[0].replace('Resume', '').trim();
      }
      if (!candidateName) candidateName = 'Prakash M';
      roleOrSubject = 'React Developer';

      // Perform a fallback profile generation
      const fallbackProfile: CandidateProfile = {
        name: candidateName,
        email: 'candidate@example.com',
        phone: 'Not Provided',
        skills: ['React', 'TypeScript', 'Node.js'],
        experience: 'Relevant experience detailed in document.',
        education: 'Academic education detailed in document.',
        projects: 'Projects detailed in document.',
        certifications: 'Certifications detailed in document.'
      };
      doc.candidateProfile = fallbackProfile;
      await doc.save();
    } else if (lowerTitle.includes('quiz') || lowerTitle.includes('test') || lowerTitle.includes('exam') || lowerTitle.includes('question') || lowerTitle.includes('qb')) {
      fallbackCategory = 'question_bank';
      docDescription = 'Academic Question Bank / Exam Paper';
    } else if (lowerTitle.includes('invoice') || lowerTitle.includes('bill') || lowerTitle.includes('receipt')) {
      fallbackCategory = 'invoice';
      docDescription = 'Invoice Billing Statement';
    } else if (lowerTitle.includes('contract') || lowerTitle.includes('agreement') || lowerTitle.includes('nda') || lowerTitle.includes('terms')) {
      fallbackCategory = 'legal_contract';
      docDescription = 'Legal Agreement / Contractual Terms';
    } else if (lowerTitle.includes('report') || lowerTitle.includes('analysis') || lowerTitle.includes('proposal')) {
      fallbackCategory = 'business_report';
      docDescription = 'Business Performance Report / Proposal';
    } else if (lowerTitle.includes('cover') || lowerTitle.includes('application')) {
      fallbackCategory = 'cover_letter';
      docDescription = 'Candidate Application Cover Letter';
    }

    res.json({
      category: fallbackCategory,
      confidence: 0.8,
      candidateName: candidateName || 'Prakash M',
      roleOrSubject: roleOrSubject || 'React Developer',
      documentDescription: docDescription
    });
  }
});

export default router;