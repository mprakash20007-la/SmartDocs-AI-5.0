import express from 'express';
import { getGeminiClient, fetchBlobAsText, fetchBlobAsBase64, Type, runBackgroundAutomation } from '../../server-core.ts';
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

const router = express.Router();

// Documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await DocumentModel.find({});
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).send('Error fetching documents');
  }
});

router.post('/documents', async (req, res) => {
  try {
    const newDocument = await DocumentModel.create(req.body);
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).send('Error creating document');
  }
});

router.get('/documents/:id', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (document) {
      res.json(document);
    } else {
      res.status(404).send('Document not found');
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).send('Error fetching document');
  }
});

router.put('/documents/:id', async (req, res) => {
  try {
    const updatedDocument = await DocumentModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedDocument) {
      res.json(updatedDocument);
    } else {
      res.status(404).send('Document not found');
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).send('Error updating document');
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const result = await DocumentModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Document not found');
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).send('Error deleting document');
  }
});

router.post('/documents/:id/chat', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).send('Prompt is required');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Based on the following document: "${await fetchBlobAsText(document.content)}"\n\nUser: ${prompt}`);
    const response = result.response.text();

    const newChat = await ChatModel.create({
      documentId: document._id,
      prompt,
      response,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error generating chat response:', error);
    res.status(500).send('Error generating chat response');
  }
});

router.post('/documents/:id/quiz', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Generate a multiple-choice quiz with 3 questions based on the following document. Provide questions, 4 options for each, and the correct answer letter (A, B, C, D). Format as JSON array of objects: "${await fetchBlobAsText(document.content)}"`);
    const response = result.response.text();

    const newQuiz = await QuizModel.create({
      documentId: document._id,
      quizContent: response,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).send('Error generating quiz');
  }
});

router.post('/documents/:id/summarize', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Summarize the following document: "${await fetchBlobAsText(document.content)}"`);
    const summary = result.response.text();

    // Assuming summary is stored as part of the document or a new entry
    const updatedDocument = await DocumentModel.findByIdAndUpdate(
      document._id,
      { $set: { summary: summary } },
      { new: true }
    );
    res.json(updatedDocument);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).send('Error generating summary');
  }
});

router.post('/documents/:id/extract-tasks', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Extract actionable tasks from the following document. Provide each task as a short string. Format as a JSON array of strings: "${await fetchBlobAsText(document.content)}"`);
    const tasksContent = result.response.text();
    const tasksArray = JSON.parse(tasksContent);

    const newTasks = await Promise.all(tasksArray.map((task: string) =>
      TaskModel.create({
        documentId: document._id,
        description: task,
        completed: false,
        timestamp: new Date().toISOString(),
      })
    ));
    res.status(201).json(newTasks);
  } catch (error) {
    console.error('Error extracting tasks:', error);
    res.status(500).send('Error extracting tasks');
  }
});

router.post('/documents/:id/extract-reminders', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Extract important reminders or follow-up actions from the following document. Provide each reminder as a short string. Format as a JSON array of strings: "${await fetchBlobAsText(document.content)}"`);
    const remindersContent = result.response.text();
    const remindersArray = JSON.parse(remindersContent);

    const newReminders = await Promise.all(remindersArray.map((reminder: string) =>
      ReminderModel.create({
        documentId: document._id,
        description: reminder,
        set: false, // Assuming 'set' means scheduled
        timestamp: new Date().toISOString(),
      })
    ));
    res.status(201).json(newReminders);
  } catch (error) {
    console.error('Error extracting reminders:', error);
    res.status(500).send('Error extracting reminders');
  }
});

router.post('/documents/:id/smart-email', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const { recipient, subject, tone } = req.body;
    if (!recipient || !subject || !tone) {
      return res.status(400).send('Recipient, subject, and tone are required');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Draft an email to "${recipient}" with the subject "${subject}" in a "${tone}" tone, based on the following document: "${await fetchBlobAsText(document.content)}"`);
    const emailBody = result.response.text();

    const newSmartEmail = await SmartEmailHistoryModel.create({
      documentId: document._id,
      recipient,
      subject,
      tone,
      body: emailBody,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(newSmartEmail);
  } catch (error) {
    console.error('Error generating smart email:', error);
    res.status(500).send('Error generating smart email');
  }
});

router.post('/documents/:id/assess-candidate', async (req, res) => {
  try {
    const document = await DocumentModel.findById(req.params.id);
    if (!document) {
      return res.status(404).send('Document not found');
    }

    const { jobDescription } = req.body;
    if (!jobDescription) {
      return res.status(400).send('Job description is required');
    }

    const geminiClient = getGeminiClient();
    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Assess the candidate described in the following document against the job description: "${jobDescription}". Provide a summary of their fit, key strengths, weaknesses, and a recommendation. Document: "${await fetchBlobAsText(document.content)}"`);
    const assessment = result.response.text();

    const newAssessment = await CandidateAssessmentModel.create({
      documentId: document._id,
      jobDescription,
      assessment,
      timestamp: new Date().toISOString(),
    });
    res.status(201).json(newAssessment);
  } catch (error) {
    console.error('Error assessing candidate:', error);
    res.status(500).send('Error assessing candidate');
  }
});

// Chats
router.get('/chats', async (req, res) => {
  try {
    const chats = await ChatModel.find({});
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).send('Error fetching chats');
  }
});

router.post('/chats', async (req, res) => {
  try {
    const newChat = await ChatModel.create(req.body);
    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).send('Error creating chat');
  }
});

router.get('/chats/:id', async (req, res) => {
  try {
    const chat = await ChatModel.findById(req.params.id);
    if (chat) {
      res.json(chat);
    } else {
      res.status(404).send('Chat not found');
    }
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).send('Error fetching chat');
  }
});

router.put('/chats/:id', async (req, res) => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedChat) {
      res.json(updatedChat);
    } else {
      res.status(404).send('Chat not found');
    }
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).send('Error updating chat');
  }
});

router.delete('/chats/:id', async (req, res) => {
  try {
    const result = await ChatModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Chat not found');
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).send('Error deleting chat');
  }
});

// Quizzes
router.get('/quizzes', async (req, res) => {
  try {
    const quizzes = await QuizModel.find({});
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).send('Error fetching quizzes');
  }
});

router.post('/quizzes', async (req, res) => {
  try {
    const newQuiz = await QuizModel.create(req.body);
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).send('Error creating quiz');
  }
});

router.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await QuizModel.findById(req.params.id);
    if (quiz) {
      res.json(quiz);
    } else {
      res.status(404).send('Quiz not found');
    }
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).send('Error fetching quiz');
  }
});

router.put('/quizzes/:id', async (req, res) => {
  try {
    const updatedQuiz = await QuizModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedQuiz) {
      res.json(updatedQuiz);
    } else {
      res.status(404).send('Quiz not found');
    }
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).send('Error updating quiz');
  }
});

router.delete('/quizzes/:id', async (req, res) => {
  try {
    const result = await QuizModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Quiz not found');
    }
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).send('Error deleting quiz');
  }
});

// Tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await TaskModel.find({});
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const newTask = await TaskModel.create(req.body);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).send('Error creating task');
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (task) {
      res.json(task);
    } else {
      res.status(404).send('Task not found');
    }
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).send('Error fetching task');
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const updatedTask = await TaskModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedTask) {
      res.json(updatedTask);
    } else {
      res.status(404).send('Task not found');
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send('Error updating task');
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await TaskModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Task not found');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).send('Error deleting task');
  }
});

// Reminders
router.get('/reminders', async (req, res) => {
  try {
    const reminders = await ReminderModel.find({});
    res.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).send('Error fetching reminders');
  }
});

router.post('/reminders', async (req, res) => {
  try {
    const newReminder = await ReminderModel.create(req.body);
    res.status(201).json(newReminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).send('Error creating reminder');
  }
});

router.get('/reminders/:id', async (req, res) => {
  try {
    const reminder = await ReminderModel.findById(req.params.id);
    if (reminder) {
      res.json(reminder);
    } else {
      res.status(404).send('Reminder not found');
    }
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).send('Error fetching reminder');
  }
});

router.put('/reminders/:id', async (req, res) => {
  try {
    const updatedReminder = await ReminderModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedReminder) {
      res.json(updatedReminder);
    } else {
      res.status(404).send('Reminder not found');
    }
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).send('Error updating reminder');
  }
});

router.delete('/reminders/:id', async (req, res) => {
  try {
    const result = await ReminderModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Reminder not found');
    }
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).send('Error deleting reminder');
  }
});

// Automation History
router.get('/automation-history', async (req, res) => {
  try {
    const history = await AutomationHistoryModel.find({});
    res.json(history);
  } catch (error) {
    console.error('Error fetching automation history:', error);
    res.status(500).send('Error fetching automation history');
  }
});

router.post('/automation-history', async (req, res) => {
  try {
    const newEntry = await AutomationHistoryModel.create(req.body);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating automation history entry:', error);
    res.status(500).send('Error creating automation history entry');
  }
});

router.get('/automation-history/:id', async (req, res) => {
  try {
    const entry = await AutomationHistoryModel.findById(req.params.id);
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).send('Automation history entry not found');
    }
  } catch (error) {
    console.error('Error fetching automation history entry:', error);
    res.status(500).send('Error fetching automation history entry');
  }
});

router.put('/automation-history/:id', async (req, res) => {
  try {
    const updatedEntry = await AutomationHistoryModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedEntry) {
      res.json(updatedEntry);
    } else {
      res.status(404).send('Automation history entry not found');
    }
  } catch (error) {
    console.error('Error updating automation history entry:', error);
    res.status(500).send('Error updating automation history entry');
  }
});

router.delete('/automation-history/:id', async (req, res) => {
  try {
    const result = await AutomationHistoryModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Automation history entry not found');
    }
  } catch (error) {
    console.error('Error deleting automation history entry:', error);
    res.status(500).send('Error deleting automation history entry');
  }
});

// Email History
router.get('/email-history', async (req, res) => {
  try {
    const history = await EmailHistoryModel.find({});
    res.json(history);
  } catch (error) {
    console.error('Error fetching email history:', error);
    res.status(500).send('Error fetching email history');
  }
});

router.post('/email-history', async (req, res) => {
  try {
    const newEntry = await EmailHistoryModel.create(req.body);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating email history entry:', error);
    res.status(500).send('Error creating email history entry');
  }
});

router.get('/email-history/:id', async (req, res) => {
  try {
    const entry = await EmailHistoryModel.findById(req.params.id);
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).send('Email history entry not found');
    }
  } catch (error) {
    console.error('Error fetching email history entry:', error);
    res.status(500).send('Error fetching email history entry');
  }
});

router.put('/email-history/:id', async (req, res) => {
  try {
    const updatedEntry = await EmailHistoryModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedEntry) {
      res.json(updatedEntry);
    } else {
      res.status(404).send('Email history entry not found');
    }
  } catch (error) {
    console.error('Error updating email history entry:', error);
    res.status(500).send('Error updating email history entry');
  }
});

router.delete('/email-history/:id', async (req, res) => {
  try {
    const result = await EmailHistoryModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Email history entry not found');
    }
  } catch (error) {
    console.error('Error deleting email history entry:', error);
    res.status(500).send('Error deleting email history entry');
  }
});

// Smart Email History
router.get('/smart-email-history', async (req, res) => {
  try {
    const history = await SmartEmailHistoryModel.find({});
    res.json(history);
  } catch (error) {
    console.error('Error fetching smart email history:', error);
    res.status(500).send('Error fetching smart email history');
  }
});

router.post('/smart-email-history', async (req, res) => {
  try {
    const newEntry = await SmartEmailHistoryModel.create(req.body);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating smart email history entry:', error);
    res.status(500).send('Error creating smart email history entry');
  }
});

router.get('/smart-email-history/:id', async (req, res) => {
  try {
    const entry = await SmartEmailHistoryModel.findById(req.params.id);
    if (entry) {
      res.json(entry);
    } else {
      res.status(404).send('Smart email history entry not found');
    }
  } catch (error) {
    console.error('Error fetching smart email history entry:', error);
    res.status(500).send('Error fetching smart email history entry');
  }
});

router.put('/smart-email-history/:id', async (req, res) => {
  try {
    const updatedEntry = await SmartEmailHistoryModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedEntry) {
      res.json(updatedEntry);
    } else {
      res.status(404).send('Smart email history entry not found');
    }
  } catch (error) {
    console.error('Error updating smart email history entry:', error);
    res.status(500).send('Error updating smart email history entry');
  }
});

router.delete('/smart-email-history/:id', async (req, res) => {
  try {
    const result = await SmartEmailHistoryModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Smart email history entry not found');
    }
  } catch (error) {
    console.error('Error deleting smart email history entry:', error);
    res.status(500).send('Error deleting smart email history entry');
  }
});

// Candidate Assessments
router.get('/candidate-assessments', async (req, res) => {
  try {
    const assessments = await CandidateAssessmentModel.find({});
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching candidate assessments:', error);
    res.status(500).send('Error fetching candidate assessments');
  }
});

router.post('/candidate-assessments', async (req, res) => {
  try {
    const newAssessment = await CandidateAssessmentModel.create(req.body);
    res.status(201).json(newAssessment);
  } catch (error) {
    console.error('Error creating candidate assessment:', error);
    res.status(500).send('Error creating candidate assessment');
  }
});

router.get('/candidate-assessments/:id', async (req, res) => {
  try {
    const assessment = await CandidateAssessmentModel.findById(req.params.id);
    if (assessment) {
      res.json(assessment);
    } else {
      res.status(404).send('Candidate assessment not found');
    }
  } catch (error) {
    console.error('Error fetching candidate assessment:', error);
    res.status(500).send('Error fetching candidate assessment');
  }
});

router.put('/candidate-assessments/:id', async (req, res) => {
  try {
    const updatedAssessment = await CandidateAssessmentModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedAssessment) {
      res.json(updatedAssessment);
    } else {
      res.status(404).send('Candidate assessment not found');
    }
  } catch (error) {
    console.error('Error updating candidate assessment:', error);
    res.status(500).send('Error updating candidate assessment');
  }
});

router.delete('/candidate-assessments/:id', async (req, res) => {
  try {
    const result = await CandidateAssessmentModel.findByIdAndDelete(req.params.id);
    if (result) {
      res.status(204).send();
    } else {
      res.status(404).send('Candidate assessment not found');
    }
  } catch (error) {
    console.error('Error deleting candidate assessment:', error);
    res.status(500).send('Error deleting candidate assessment');
  }
});

// Settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await SettingsModel.findOne({});
    if (settings) {
      res.json(settings);
    } else {
      // If settings don't exist, return a default or 404
      res.status(404).send('Settings not found');
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).send('Error fetching settings');
  }
});

router.put('/settings', async (req, res) => {
  try {
    // Use findOneAndUpdate with upsert: true to create if not exists, update if exists
    const updatedSettings = await SettingsModel.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).send('Error updating settings');
  }
});

// Automation Trigger
router.post('/run-automation', async (req, res) => {
  try {
    // runBackgroundAutomation itself will need to be refactored to use Mongoose internally
    await runBackgroundAutomation();
    res.status(200).send('Automation started');
  } catch (error) {
    console.error('Error running automation:', error);
    res.status(500).send('Error running automation');
  }
});

export default router;