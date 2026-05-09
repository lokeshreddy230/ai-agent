# Executive OS: Autonomous Startup Assistant

![Executive OS Dashboard](public/screenshot.png) *(Note: Please place a dashboard screenshot in `public/screenshot.png`)*

Executive OS is a high-performance, production-grade, autonomous intelligence platform built to act as the ultimate "Chief of Staff" for startup founders and executives. It completely automates inbox management, parses real-time market intelligence, handles WhatsApp communications autonomously with human-like fidelity, and delivers a unified, glassmorphic executive dashboard—all completely Serverless via Next.js.

## 🌟 Core Features

- **Real-Time Gmail Intelligence:** Securely authenticates with Google OAuth to pull live emails. Employs a pre-LLM heuristic clustering engine to filter out noise, group promotions, and isolate critical operational signals (e.g., GitHub failures, security alerts) before sending to the AI.
- **Human-Fidelity WhatsApp Engine:** Utilizes `whatsapp-web.js` and Puppeteer to establish a headless WhatsApp client. Integrates an advanced conversational agent that mimics casual human texting behaviors (lowercase, short sentences, contextual emojis) while avoiding robotic "AI assistant" tropes. Features complete session lifecycle management, QR-code authentication, and dynamic typing simulation.
- **Distributed Micro-Generation Pipeline:** Replaces monolithic generation with a resilient, chunked architecture. Processes large inbox datasets in batches through Groq's high-speed Llama 3 models (`llama-3.3-70b-versatile` & `llama-3.1-8b-instant`), completely bypassing rate limits and TPM constraints.
- **Live SSE Telemetry:** Provides real-time dashboard updates via Server-Sent Events (SSE). Users can watch the `Manager Agent`, `Validation Agent`, and `Reply Agent` work in real-time as sections populate instantly without waiting for the full generation to conclude.
- **Memory & Relationship Graph:** Implements a localized Memory Agent (`memory.json`) that maintains persistent conversation histories, tracks user sentiment/mood, and calculates interaction relationship scores, allowing the AI to naturally recall past context.
- **Multi-Source Market Intel:** Integrates Tavily API for real-time web searches and news parsing, alongside Apify for tracking LinkedIn activity, funneling all external data into the unified "Executive Intelligence Feed."

## 🏗 Architecture

The platform operates on a robust, 100% Next.js Serverless architecture, eliminating the need for a separate Python backend.

1. **Frontend (`app/page.tsx`)**: An aesthetic, dark-mode, glassmorphism React dashboard using Tailwind CSS and Framer Motion. Handles SSE streams, state management, and OAuth UI.
2. **Intelligence Pipeline (`api/generate-report/route.ts`)**: The core AI brain. Fetches from Gmail, WhatsApp, and Tavily. Clusters data, invokes Groq LLMs via a progressive batching strategy, validates JSON outputs, and streams real-time updates back to the UI.
3. **WhatsApp Service (`lib/whatsapp.ts` & `api/whatsapp/route.ts`)**: A singleton class managing the local headless browser session, handling real-time message events, and bridging them to the LLM reply engine.
4. **Memory Engine (`lib/memory.ts`)**: A localized persistence layer for tracking conversational state and ensuring the AI remains contextually aware across multiple days/sessions.

## 🚀 Getting Started

### Prerequisites

Ensure you have Node.js 18+ installed on your machine.

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root of the `frontend` directory and populate it with your API keys:
   ```env
   # Google OAuth Credentials
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # AI Inference
   GROQ_API_KEY=your_groq_api_key

   # Market Intelligence
   TAVILY_API_KEY=your_tavily_api_key

   # Social/Networking
   APIFY_API_TOKEN=your_apify_api_token
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛡️ Security & Privacy

- **No Remote Databases:** All sensitive emails, tokens, and WhatsApp session data are stored strictly locally in the `frontend/.whatsapp-session` and `memory.json` files, ensuring maximum data sovereignty.
- **OAuth Scopes:** Requests only the necessary read/modify scopes from Gmail to operate safely.
- **Rate Limit Resilience:** The pipeline uses exponential back-off and progressive batching to ensure stability and cost-efficiency.

## 🤖 Model Ecosystem

This platform leverages the **Groq API** for ultra-fast, low-latency AI inference:
- `llama-3.3-70b-versatile` - Used for deep strategic insights, executive intelligence generation, and JSON schema validation.
- `llama-3.1-8b-instant` - Used for rapid, high-throughput email chunk summarization and priority queue generation.

---
*Built for the future of autonomous startup operations.*
