const fs = require('fs');
const path = require('path');

const filesToUpdate = ['server.ts'];

filesToUpdate.forEach(file => {
  const fp = path.join(__dirname, file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    
    // Replace the PORT definition
    content = content.replace(
      /const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT, 10\) : \d+;/,
      'const PORT = process.env.PORT || 5174;'
    );

    // Replace all other instances of localhost:3000 with localhost:5174
    content = content.replace(/localhost:3000/g, 'localhost:5174');
    
    fs.writeFileSync(fp, content);
    console.log('Updated ' + file);
  }
});

// Update .env files
const envFiles = ['.env', '.env.example', '.env.local'];
envFiles.forEach(file => {
  const fp = path.join(__dirname, file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    
    if (content.includes('PORT=')) {
      content = content.replace(/PORT=\d+/, 'PORT=5174');
    } else {
      content += '\\nPORT=5174\\n';
    }
    
    fs.writeFileSync(fp, content);
    console.log('Updated ' + file);
  } else {
    if (file === '.env' || file === '.env.example') {
      fs.writeFileSync(fp, 'PORT=5174\\n');
      console.log('Created ' + file);
    }
  }
});
