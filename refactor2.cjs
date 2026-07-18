const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update imports
code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"]@google\/genai['"];?\r?\n?/g, "import { askAI } from './server/services/ai.ts';\n");

// 2. Remove client initialization
code = code.replace(/^[ \t]*const\s+(?:client|genAI)\s*=\s*getGeminiClient\(\);?\r?\n?/gm, '');

// 3. Remove getGeminiClient function
code = code.replace(/function\s+getGeminiClient\(\)\s*\{[\s\S]*?return\s+new\s+GoogleGenAI[\s\S]*?\}\r?\n?/g, '');

// 4. Parse generateContent blocks
let out = '';
let i = 0;
while (i < code.length) {
  const match = code.indexOf('await client.models.generateContent({', i);
  if (match === -1) {
    out += code.slice(i);
    break;
  }

  let preceding = code.slice(Math.max(0, match - 50), match);
  let varNameMatch = preceding.match(/(?:const|let)\s+(\w+)\s*=\s*$/);
  let varName = varNameMatch ? varNameMatch[1] : 'response';
  
  if (varNameMatch) {
    out += code.slice(i, match - varNameMatch[0].length);
  } else {
    out += code.slice(i, match);
  }

  let startObj = match + 'await client.models.generateContent('.length;
  let braceCount = 0;
  let endObj = -1;
  
  for (let j = startObj; j < code.length; j++) {
    if (code[j] === '{') braceCount++;
    if (code[j] === '}') braceCount--;
    if (braceCount === 0) {
      endObj = j + 1;
      break;
    }
  }

  let closing = code.indexOf(');', endObj);
  if (closing !== -1 && closing - endObj < 10) {
    endObj = closing + 2;
  }

  let objText = code.slice(startObj, endObj);
  
  // Custom regex to extract the `contents:` field.
  // It handles nested brackets poorly if contents contains braces, but contents usually is a variable name or simple array.
  let contentsMatch = objText.match(/contents\s*:\s*(.+?)(?:,\s*config|\s*\})/);
  
  if (contentsMatch) {
    let contentVar = contentsMatch[1].trim();
    if (contentVar.endsWith(',')) {
        contentVar = contentVar.slice(0, -1).trim();
    }
    out += `const ${varName}Text = await askAI(typeof ${contentVar} === 'string' ? ${contentVar} : JSON.stringify(${contentVar}));\n    const ${varName} = { text: ${varName}Text };`;
  } else {
    out += `const ${varName}Text = await askAI("...");\n    const ${varName} = { text: ${varName}Text };`;
  }

  i = endObj;
}

fs.writeFileSync('server.ts', out);
console.log('Refactoring complete.');
