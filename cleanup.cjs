const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove `let ai: GoogleGenAI | null = null;`
code = code.replace(/let\s+ai:\s*GoogleGenAI\s*\|\s*null\s*=\s*null;\r?\n?/g, '');

// 2. Remove `function getGeminiClient(): GoogleGenAI { ... }`
code = code.replace(/function\s+getGeminiClient\(\)[\s\S]*?return\s+ai;?\r?\n\}\r?\n?/g, '');

// 3. Remove `const client = getGeminiClient();`
code = code.replace(/const client = getGeminiClient\(\);\r?\n?/g, '');

// 4. Remove `if (client && process.env.GEMINI_API_KEY)` 
code = code.replace(/if\s*\(\s*client\s*&&\s*process\.env\.GEMINI_API_KEY\s*\)/g, 'if (true)');

fs.writeFileSync('server.ts', code);
console.log('Cleanup complete.');
