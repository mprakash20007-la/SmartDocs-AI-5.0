const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove GoogleGenAI import
code = code.replace(/import\s*\{\s*GoogleGenAI[^}]*\}\s*from\s*['"]@google\/genai['"];?\r?\n?/g, '');

// 2. Add askAI import
if (!code.includes('import { askAI }')) {
  code = code.replace(/(import .*?\r?\n)/, "$1import { askAI } from './server/services/ai.ts';\n");
}

// 3. Remove getGeminiClient definition
code = code.replace(/function getGeminiClient\(\) \{[\s\S]*?return new GoogleGenAI[\s\S]*?\}\r?\n?/g, '');

// 4. Remove const client = getGeminiClient();
code = code.replace(/const client = getGeminiClient\(\);\r?\n?/g, '');

// 5. Replace generateContent blocks
// We want to capture:
// const response = await client.models.generateContent({ ...contents... });
// response.text -> responseText

const generateContentRegex = /(?:const|let)\s+(\w+)\s*=\s*await\s+client\.models\.generateContent\(\s*\{[\s\S]*?contents\s*:\s*(.+?),?(?:\s*config\s*:[\s\S]*?)?\}\s*\);/g;

code = code.replace(generateContentRegex, (match, responseVarName, contentsVar) => {
  // contentsVar could be `prompt` or `contents` or an array string
  // If it's an array or complex object, we'll wrap it in JSON.stringify to be safe, 
  // but if it's just an identifier or string literal, we leave it.
  
  let arg = contentsVar.trim();
  
  return `const ${responseVarName}Text = await askAI(typeof ${arg} === 'string' ? ${arg} : JSON.stringify(${arg}));\n    const ${responseVarName} = { text: ${responseVarName}Text };`;
});

fs.writeFileSync('server.ts', code);
console.log('Refactoring complete.');
