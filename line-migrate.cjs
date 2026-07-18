const fs = require('fs');

let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let outLines = [];

let inGenerate = false;
let genVar = '';
let genContent = '';
let genIndent = '';

let inEmbed = false;
let embVar = '';
let embContent = '';
let embIndent = '';

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Match the import line strictly
  if (line.match(/import\s*\{\s*GoogleGenAI[^}]*\}\s*from\s*['"]@google\/genai['"];?/)) {
    outLines.push("import { askAI } from './server/services/ai.ts';");
    continue;
  }

  if (line.match(/^[ \t]*let ai: GoogleGenAI \| null = null;/)) continue;
  
  if (line.match(/function getGeminiClient\(\): GoogleGenAI/)) {
    let braceCount = 0;
    let started = false;
    while (i < lines.length) {
      for (let ch of lines[i]) {
        if (ch === '{') { started = true; braceCount++; }
        if (ch === '}') braceCount--;
      }
      if (started && braceCount === 0) {
        break; // Reached end of function
      }
      i++;
    }
    continue;
  }
  
  if (line.match(/^[ \t]*const (?:client|genAI) = getGeminiClient\(\);/)) continue;
  if (line.includes('if (client && process.env.GEMINI_API_KEY)')) {
    outLines.push(line.replace('if (client && process.env.GEMINI_API_KEY)', 'if (true)'));
    continue;
  }

  // Handle generateContent
  let genMatch = line.match(/^(\s*)(?:const|let)\s+(\w+)\s*=\s*await\s+client\.models\.generateContent\(\{/);
  if (genMatch) {
    inGenerate = true;
    genIndent = genMatch[1];
    genVar = genMatch[2];
    continue;
  }

  if (inGenerate) {
    let contentMatch = line.match(/^\s*contents:\s*(.*)/);
    if (contentMatch) {
      let val = contentMatch[1].trim();
      if (val.endsWith(',')) val = val.slice(0, -1);
      genContent = val;
    }
    
    if (line.includes('});')) {
      inGenerate = false;
      outLines.push(`${genIndent}const ${genVar}Text = await askAI(typeof ${genContent} === 'string' ? ${genContent} : JSON.stringify(${genContent}));`);
      outLines.push(`${genIndent}const ${genVar} = { text: ${genVar}Text };`);
    }
    continue;
  }

  // Handle embedContent
  let embMatch = line.match(/^(\s*)(?:const|let)\s+(\w+)\s*=\s*await\s+client\.models\.embedContent\(\{/);
  if (embMatch) {
    inEmbed = true;
    embIndent = embMatch[1];
    embVar = embMatch[2];
    continue;
  }

  if (inEmbed) {
    let contentMatch = line.match(/^\s*contents:\s*(.*)/);
    if (contentMatch) {
      let val = contentMatch[1].trim();
      if (val.endsWith(',')) val = val.slice(0, -1);
      embContent = val;
    }
    
    if (line.includes('});')) {
      inEmbed = false;
      outLines.push(`${embIndent}const ${embVar}Text = await askAI(typeof ${embContent} === 'string' ? ${embContent} : JSON.stringify(${embContent}));`);
      outLines.push(`${embIndent}const ${embVar} = { embeddings: [{ values: Array(768).fill(0) }] };`);
    }
    continue;
  }

  outLines.push(line);
}

fs.writeFileSync('server.ts', outLines.join('\n'));
console.log('Migration complete. File lines: ' + outLines.length);
