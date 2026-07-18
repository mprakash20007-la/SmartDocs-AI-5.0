import { put, list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const token = process.env.BLOB_READ_WRITE_TOKEN;

async function run() {
  const action = process.argv[2];
  
  if (!token) {
    console.warn('BLOB_READ_WRITE_TOKEN is not configured. Cloud sync is disabled.');
    process.exit(0);
  }

  if (action === 'download') {
    try {
      console.log('Listing blobs to find db.json...');
      const { blobs } = await list({ token });
      const dbBlob = blobs.find(b => b.pathname === 'db.json');
      
      if (dbBlob) {
        console.log(`Downloading database from ${dbBlob.url}...`);
        const response = await fetch(dbBlob.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DB_FILE, text, 'utf8');
        console.log('Database downloaded and saved to', DB_FILE);
      } else {
        console.log('No database file found in Blob storage. Starting with pre-seeded database if available.');
      }
    } catch (err) {
      console.error('Download failed:', err);
      process.exit(1);
    }
  } else if (action === 'upload') {
    try {
      if (!fs.existsSync(DB_FILE)) {
        console.error('Local db.json file not found at:', DB_FILE);
        process.exit(1);
      }
      
      console.log('Uploading database to Vercel Blob...');
      const fileContent = fs.readFileSync(DB_FILE);
      
      const blob = await put('db.json', fileContent, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token
      });
      console.log('Database successfully uploaded to:', blob.url);
    } catch (err) {
      console.error('Upload failed:', err);
      process.exit(1);
    }
  }
}

run();
