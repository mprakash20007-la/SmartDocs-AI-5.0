const fs = require('fs');

let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
for (let i = 2980; i < 3000; i++) {
  if (lines[i] && lines[i].includes('const responseText = await askAI(typeof analysisPrompt')) {
    lines[i] = lines[i].replace(/analysisPrompt/g, 'contents');
    break;
  }
}
fs.writeFileSync('server.ts', lines.join('\n'));
console.log('Fixed analysisPrompt TS error.');
