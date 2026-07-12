# SmartDocs AI — Transform Documents into Instant Knowledge

SmartDocs AI is a premium, production-ready AI SaaS Knowledge Assistant built for hackathons and startups. It enables students, researchers, teachers, and professionals to upload PDFs, DOCX, and TXT files, and interact with them using natural language.

## 🚀 Key Features

- **Premium UI/UX**: Dark theme featuring floating aurora particles, magnetic buttons, and responsive glassmorphic cards.
- **Vast Multimodal AI**: Powered by Google Gemini 3.5 Flash for semantic document processing with zero-hallucination citations.
- **Executive Summarizer**: Auto-extracts summaries, key takeaways, critical insights, and action items in clean grid sections.
- **Threaded Context Chat**: Deep-dive dialogue with the file with full scroll locking, suggestion cues, and response regenerations.
- **Educational Quiz Generator**: Select difficulty and answer multiple-choice questions with instant correct/incorrect highlights and rationale explanations.
- **Usage & Activity Dashboard**: Full statistics suite to evaluate study progress and scoring metrics.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **AI**: Google Gemini API via `@google/genai` TypeScript SDK.
- **Persistence**: File system local storage (JSON DB) for high-performance MVPs.

## 📦 Project Setup & Installation

1. Install base dependencies:
   ```bash
   npm install
   ```

2. Verify environment variables in `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```

4. Build and run in production:
   ```bash
   npm run build
   npm run start
   ```

---
Designed for Hackathon Excellence. Powered by Google Gemini.
