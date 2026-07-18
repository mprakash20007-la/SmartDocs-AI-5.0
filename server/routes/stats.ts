import express from 'express';
import { getGeminiClient, Type, runBackgroundAutomation } from '../../server-core.ts';
import { DocumentModel, ChatModel, QuizModel } from '../db/mongo.ts';

const router = express.Router();

router.get('/api/stats', async (req, res) => {
  try {
    const totalDocs = await DocumentModel.countDocuments();
    const totalChats = await ChatModel.countDocuments();
    const completedQuizzes = await QuizModel.find({ score: { $ne: undefined } });
    const totalQuizzes = completedQuizzes.length;
    
    let totalQuestions = 0;
    let totalCorrect = 0;
    completedQuizzes.forEach(q => {
      totalQuestions += q.questions.length;
      totalCorrect += q.score || 0;
    });

    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const stats: UserStats = { // Assuming UserStats type is defined elsewhere or globally available
      totalDocuments: totalDocs,
      totalChats: totalChats,
      totalQuizzes: totalQuizzes,
      totalQuestionsAnswered: totalQuestions,
      averageScore: averageScore
    };
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;