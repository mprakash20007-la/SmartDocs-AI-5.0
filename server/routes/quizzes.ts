import express from 'express';
import { getGeminiClient, Type, runBackgroundAutomation } from '../../server-core.ts';
import { QuizModel } from '../db/mongo.ts';

const router = express.Router();

router.post('/api/quizzes/:id/submit', async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined) {
      return res.status(400).json({ error: 'Missing score' });
    }

    const updatedQuiz = await QuizModel.findByIdAndUpdate(
      req.params.id,
      {
        score,
        completedAt: new Date().toISOString(),
      },
      { new: true } // Return the updated document
    );

    if (!updatedQuiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json(updatedQuiz);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/quizzes', async (req, res) => {
  try {
    const { documentId } = req.query;
    let quizzes;

    if (documentId) {
      quizzes = await QuizModel.find({ documentId: String(documentId) });
    } else {
      quizzes = await QuizModel.find({});
    }
    res.json(quizzes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;