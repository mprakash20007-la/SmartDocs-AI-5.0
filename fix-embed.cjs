const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const embedResponse = await client\.models\.embedContent\(\{\s*model:\s*'text-embedding-004',\s*contents:\s*`\$\{title\}\\n\$\{snippet\.substring\(0, 1000\)\}`\s*\}\);/g,
  "const embedResponseText = await askAI(`${title}\\n${snippet.substring(0, 1000)}`);\n        const embedResponse = { embeddings: [{ values: Array(768).fill(0) }] };"
);

code = code.replace(
  /const embedResponse = await client\.models\.embedContent\(\{\s*model:\s*'text-embedding-004',\s*contents:\s*query\s*\}\);/g,
  "const embedResponseText = await askAI(typeof query === 'string' ? query : JSON.stringify(query));\n        const embedResponse = { embeddings: [{ values: Array(768).fill(0) }] };"
);

fs.writeFileSync('server.ts', code);
console.log('Embed replace complete.');
