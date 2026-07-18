import { HfInference } from '@huggingface/inference';

// ----------------------------------------------------------------------------
// Core Interface
// ----------------------------------------------------------------------------
export interface IAIProvider {
  generate(prompt: string): Promise<string>;
}

// ----------------------------------------------------------------------------
// Implementations
// ----------------------------------------------------------------------------

/**
 * Hugging Face Provider
 */
class HuggingFaceProvider implements IAIProvider {
  private hf: HfInference;
  private model: string;

  constructor() {
    this.hf = new HfInference(process.env.HF_TOKEN);
    this.model = 'Qwen/Qwen2.5-7B-Instruct';
  }

  async generate(prompt: string): Promise<string> {
    const token = process.env.HF_TOKEN;
    if (!token || token === 'your_huggingface_token_here') {
      console.log(`[AI Mock Mode] Intercepted prompt due to missing API key.`);
      
      // Provide intelligent mock responses based on prompt keywords
      const p = prompt.toLowerCase();
      if (p.includes('interview questions')) {
        return JSON.stringify({
          questions: [
            "Can you explain the architecture of a complex project you built?",
            "How do you handle state management in React at scale?",
            "Describe a time you resolved a critical production bug.",
            "What strategies do you use for optimizing web performance?",
            "How do you approach team collaboration and code reviews?"
          ]
        });
      } else if (p.includes('evaluate') || p.includes('score')) {
        return JSON.stringify({
          score: 9,
          feedback: "Great foundational knowledge and problem-solving skills.",
          strengths: ["Architecture", "React fundamentals"],
          weaknesses: ["Deep optimization specifics"],
          recommendations: "Review advanced caching strategies."
        });
      }
      
      return JSON.stringify({ result: "Mocked AI Response for development mode." });
    }

    try {
      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const generatedText = response.choices[0]?.message?.content;
      if (!generatedText) {
        throw new Error("AI returned an empty response.");
      }
      return generatedText;
    } catch (error: any) {
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

/**
 * OpenAI / OpenAI-Compatible Provider
 * Supports generic OpenAI REST endpoints.
 */
class OpenAIProvider implements IAIProvider {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    // Provide a trailing slash stripped default URL
    const rawUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
    this.apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!this.apiKey && this.apiUrl.includes('api.openai.com')) {
      console.warn('OPENAI_API_KEY is not set but AI_PROVIDER is openai.');
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content;
      
      if (!generatedText) {
        throw new Error("AI returned an empty or malformed payload.");
      }
      return generatedText;
    } catch (error: any) {
      console.error(`[OpenAI Provider Error]:`, error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

/**
 * Local Ollama Provider
 */
class OllamaProvider implements IAIProvider {
  private apiUrl: string;
  private model: string;

  constructor() {
    const rawUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    this.apiUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    this.model = process.env.OLLAMA_MODEL || 'llama3';
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (!data.response) {
        throw new Error("Ollama returned an empty response.");
      }
      return data.response;
    } catch (error: any) {
      console.error(`[Ollama Provider Error]:`, error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
}

// ----------------------------------------------------------------------------
// Factory
// ----------------------------------------------------------------------------
class AIFactory {
  private static instance: IAIProvider;

  static getProvider(): IAIProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = (process.env.AI_PROVIDER || 'huggingface').toLowerCase();

    switch (providerType) {
      case 'openai':
        this.instance = new OpenAIProvider();
        break;
      case 'ollama':
        this.instance = new OllamaProvider();
        break;
      case 'huggingface':
      default:
        this.instance = new HuggingFaceProvider();
        break;
    }

    console.log(`[AI Factory] Initialized ${providerType} provider.`);
    return this.instance;
  }
}

// ----------------------------------------------------------------------------
// Facade
// ----------------------------------------------------------------------------

/**
 * Single AI gateway for the whole project.
 * Uses the factory to route requests to the configured provider.
 * 
 * @param prompt The input text prompt to send to the AI
 * @returns The generated response text from the AI
 */
export async function askAI(prompt: string): Promise<string> {
  const provider = AIFactory.getProvider();
  return provider.generate(prompt);
}
