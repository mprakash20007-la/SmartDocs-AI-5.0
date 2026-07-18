import express from 'express';
import path from 'path';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import './server/db/mongo.ts';

import candidatesRouter from './server/routes/candidates.ts';
import chatsRouter from './server/routes/chats.ts';
import documentsRouter from './server/routes/documents.ts';
import miscRouter from './server/routes/misc.ts';
import quizzesRouter from './server/routes/quizzes.ts';
import remindersRouter from './server/routes/reminders.ts';
import smartEmailRouter from './server/routes/smart-email.ts';
import statsRouter from './server/routes/stats.ts';
import tasksRouter from './server/routes/tasks.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 5175;

// Enable large payloads for document uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(candidatesRouter);
app.use(chatsRouter);
app.use(documentsRouter);
app.use(miscRouter);
app.use(quizzesRouter);
app.use(remindersRouter);
app.use(smartEmailRouter);
app.use(statsRouter);
app.use(tasksRouter);

// Connect Vite integration or serve production files
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
