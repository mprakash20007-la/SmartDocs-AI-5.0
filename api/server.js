import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force Vercel Node File Trace to bundle dist/sync-db.cjs
try {
  fs.readFileSync(path.join(__dirname, '../dist/sync-db.cjs'), 'utf8');
} catch (e) {}

import server from '../dist/server.cjs';
const app = server.default || server;
export default app;

