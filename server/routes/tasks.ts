import express from 'express';
import { TaskModel } from '../db/mongo.ts'; // Import TaskModel

const router = express.Router();

router.post('/api/tasks/:id/toggle', async (req, res) => { // Make handler async
  try {
    // Replace db.tasks.findIndex and update with Mongoose findOneAndUpdate
    // Using an aggregation pipeline for $set to atomically toggle the boolean field
    const updatedTask = await TaskModel.findOneAndUpdate(
      { id: req.params.id }, // Find the task by its 'id' field
      [{ $set: { completed: { $not: "$completed" } } }], // Toggle the 'completed' field
      { new: true } // Return the updated document
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // saveDb(db) is no longer needed as Mongoose operations persist changes directly
    res.json(updatedTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/tasks', async (req, res) => { // Make handler async
  try {
    // Replace loadDb() and db.tasks with Mongoose find
    const tasks = await TaskModel.find({}); // Fetch all tasks

    // Mongoose's find() method returns an empty array if no documents match,
    // so `|| []` is technically redundant but harmless.
    res.json(tasks || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;