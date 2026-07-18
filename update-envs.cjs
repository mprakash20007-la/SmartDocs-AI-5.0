const fs = require('fs');
const path = require('path');

const newConfigs = `

# AI Provider Configuration (huggingface, openai, ollama)
AI_PROVIDER=huggingface

# OpenAI / OpenAI-Compatible API Settings
OPENAI_API_KEY=
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Local Ollama Settings
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3
`;

['.env', '.env.example', '.env.local'].forEach(file => {
  const fp = path.join(__dirname, file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    if (!content.includes('AI_PROVIDER')) {
      fs.appendFileSync(fp, newConfigs);
      console.log('Updated ' + file);
    }
  }
});
