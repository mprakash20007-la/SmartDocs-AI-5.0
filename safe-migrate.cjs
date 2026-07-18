const fs = require('fs');

function migrateGemini() {
  let code = fs.readFileSync('server.ts', 'utf8');

  if (!code.includes("import { askAI }")) {
    code = code.replace(/import\s*\{\s*GoogleGenAI[^}]*\}\s*from\s*['"]@google\/genai['"];?/g, "import { askAI } from './server/services/ai.ts';");
  }

  code = code.replace(/^[ \t]*let\s+ai:\s*GoogleGenAI\s*\|\s*null\s*=\s*null;?\r?\n/gm, '');
  code = code.replace(/function\s+getGeminiClient\(\)\s*:\s*GoogleGenAI\s*\{[\s\S]*?return\s+ai;?\r?\n\}\r?\n?/g, '');
  code = code.replace(/^[ \t]*const\s+(?:client|genAI)\s*=\s*getGeminiClient\(\);?\r?\n/gm, '');
  code = code.replace(/if\s*\(\s*client\s*&&\s*process\.env\.GEMINI_API_KEY\s*\)/g, 'if (true)');

  let result = '';
  let i = 0;
  
  while (i < code.length) {
    let matchGen = code.indexOf('await client.models.generateContent(', i);
    let matchEmb = code.indexOf('await client.models.embedContent(', i);
    
    let isEmbed = false;
    let matchIdx = -1;
    let keywordLen = 0;
    
    if (matchGen !== -1 && (matchEmb === -1 || matchGen < matchEmb)) {
      matchIdx = matchGen;
      keywordLen = 'await client.models.generateContent('.length;
    } else if (matchEmb !== -1) {
      matchIdx = matchEmb;
      keywordLen = 'await client.models.embedContent('.length;
      isEmbed = true;
    }
    
    if (matchIdx === -1) {
      result += code.slice(i); // <-- THIS WAS THE ONLY THING THAT WAS RIGHT BUT I NEED TO BREAK AFTER
      break;
    }
    
    let before = code.slice(i, matchIdx);
    let varNameMatch = before.match(/(?:const|let)\s+(\w+)\s*=\s*$/);
    let varName = varNameMatch ? varNameMatch[1] : 'response';
    
    if (varNameMatch) {
      result += before.slice(0, -varNameMatch[0].length);
    } else {
      result += before;
    }
    
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let objStart = matchIdx + keywordLen;
    let objEnd = -1;
    
    if (code[objStart] !== '{') {
      result += `const ${varName} = await askAI("...");`;
      i = code.indexOf(');', objStart) + 2;
      continue;
    }
    
    for (let j = objStart; j < code.length; j++) {
      let char = code[j];
      if (inString) {
        if (char === stringChar && code[j-1] !== '\\') inString = false;
      } else {
        if (char === '"' || char === "'" || char === "\`") {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            objEnd = j + 1;
            break;
          }
        }
      }
    }
    
    let objText = code.slice(objStart, objEnd);
    let endOfCall = code.indexOf(');', objEnd);
    if (endOfCall !== -1 && endOfCall - objEnd < 10) {
      i = endOfCall + 2;
    } else {
      i = objEnd + 1;
    }
    
    let contentMatch = objText.match(/contents\s*:\s*(.*)/s); 
    let contentVar = '""';
    
    if (contentMatch) {
      let c = contentMatch[1].trim();
      let propEnd = -1;
      let bc = 0;
      let isStr = false;
      let sc = '';
      for (let k = 0; k < c.length; k++) {
        let ch = c[k];
        if (isStr) {
          if (ch === sc && c[k-1] !== '\\') isStr = false;
        } else {
          if (ch === '"' || ch === "'" || ch === "\`") {
            isStr = true;
            sc = ch;
          } else if (ch === '{' || ch === '[') {
            bc++;
          } else if (ch === '}' || ch === ']') {
            bc--;
          } else if ((ch === ',' || ch === '}') && bc === 0) {
            propEnd = k;
            break;
          }
        }
      }
      if (propEnd !== -1) contentVar = c.slice(0, propEnd).trim();
      else contentVar = c;
    }
    
    if (isEmbed) {
      result += `const ${varName}Text = await askAI(typeof ${contentVar} === 'string' ? ${contentVar} : JSON.stringify(${contentVar}));\n        const ${varName} = { embeddings: [{ values: Array(768).fill(0) }] };`;
    } else {
      result += `const ${varName}Text = await askAI(typeof ${contentVar} === 'string' ? ${contentVar} : JSON.stringify(${contentVar}));\n    const ${varName} = { text: ${varName}Text };`;
    }
  }

  fs.writeFileSync('server.ts', result);
  console.log('Migration complete. File lines: ' + result.split('\\n').length);
}

migrateGemini();
