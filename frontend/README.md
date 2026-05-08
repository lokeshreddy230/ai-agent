# Startup Operations Assistant (Serverless)

This project has been fully migrated to a Next.js Serverless architecture. **There is no Python backend.**

## Getting Started

1. Navigate to the frontend directory (if you aren't already):
   ```bash
   cd frontend
   ```

2. Ensure your `.env.local` file contains:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
   - `APIFY_API_TOKEN`

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Progressive Batching Intelligence
The intelligence pipeline automatically fetches up to 25 emails, uses heuristic clustering to isolate noisy alerts (LinkedIn/GitHub/Promotions), and processes the remaining operational signals in small batches through Groq to strictly respect free-tier API rate limits.
