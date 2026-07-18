import express from 'express';
import { getGeminiClient, Type, runBackgroundAutomation } from '../../server-core.ts';
import { DocumentModel, ChatModel, QuizModel, TaskModel, ReminderModel, AutomationHistoryModel, EmailHistoryModel, SmartEmailHistoryModel, CandidateAssessmentModel, SettingsModel } from '../db/mongo.ts';

const router = express.Router();

router.get('/api/reminders', async (req, res) => {
  try {
    const reminders = await ReminderModel.find({});
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;