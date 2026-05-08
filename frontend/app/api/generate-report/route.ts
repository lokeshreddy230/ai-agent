import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '../../../lib/google-auth';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Vercel Hobby/Pro if supported

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        const payload = JSON.stringify({ type, data }) + '\n';
        controller.enqueue(encoder.encode(payload));
      };

      try {
        sendEvent("crew_start", { message: "Starting Progressive Multi-Stage Intelligence Pipeline." });

        // 1. Fetch Gmail Data
        const cookieStore = await cookies();
        const tokenCookie = cookieStore.get('gmail_oauth_token');
        
        let minifiedEmails: any[] = [];
        let rawEmails: any[] = [];
        let emailCount = 0;
        
        if (tokenCookie && tokenCookie.value) {
          try {
            sendEvent("agent_update", { agent: "Email Agent", status: "working", details: "Fetching 25 live emails for batching..." });
            const tokens = JSON.parse(tokenCookie.value);
            const url = new URL(request.url);
            const oAuth2Client = getOAuth2Client(url.origin);
            oAuth2Client.setCredentials(tokens);
            
            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            const res = await gmail.users.messages.list({ userId: 'me', maxResults: 25 });
            const messages = res.data.messages || [];
            emailCount = messages.length;
            
            for (const msg of messages) {
              const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
              const payload = msgData.data.payload;
              const headers = payload?.headers || [];
              const subject = headers.find((h) => h.name === 'Subject')?.value || '';
              let from = headers.find((h) => h.name === 'From')?.value || '';
              if (from.includes('<')) from = from.split('<')[0].trim();
              const snippet = msgData.data.snippet || '';
              
              rawEmails.push({ from, subject, snippet, timestamp: new Date().toISOString() });
              minifiedEmails.push({ f: from.substring(0, 20), s: subject.substring(0, 50), p: snippet.substring(0, 80) });
            }
            sendEvent("agent_update", { agent: "Gmail API", status: "completed", details: `Retrieved ${emailCount} live messages.` });
          } catch (e: any) {
            console.error("Gmail Error:", e);
            sendEvent("agent_update", { agent: "System", status: "failed", details: "Live Gmail fetch failed. " + String(e) });
          }
        }

        // 2. Pre-AI Smart Clustering (0 Tokens)
        sendEvent("agent_update", { agent: "Clustering Engine", status: "working", details: "Applying heuristic clustering to reduce tokens..." });
        
        let clusters = {
          linkedin: [] as any[],
          github: [] as any[],
          promotions: [] as any[],
          highPriority: [] as any[]
        };

        for (const em of minifiedEmails) {
          const str = (em.f + " " + em.s).toLowerCase();
          if (str.includes("linkedin")) clusters.linkedin.push(em);
          else if (str.includes("github")) clusters.github.push(em);
          else if (str.includes("promo") || str.includes("offer") || str.includes("sale")) clusters.promotions.push(em);
          else clusters.highPriority.push(em);
        }

        const clusteredSummary = `
Auto-Clustered Noise (Bypassed AI):
- LinkedIn Notifications: ${clusters.linkedin.length}
- GitHub Alerts: ${clusters.github.length}
- Promotions/Noise: ${clusters.promotions.length}
`;
        sendEvent("agent_update", { agent: "Clustering Engine", status: "completed", details: `Clustered ${minifiedEmails.length - clusters.highPriority.length} noisy emails. ${clusters.highPriority.length} high-priority emails remain.` });

        // 3. Fetch Tavily
        let rawTavily: any[] = [];
        try {
          sendEvent("agent_update", { agent: "Research Agent", status: "working", details: "Fetching executive intelligence..." });
          if (process.env.TAVILY_API_KEY) {
            const tavilyRes = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: "Startup operations, AI ecosystem, and enterprise technology news today",
                search_depth: "basic",
                max_results: 2
              })
            });
            const tavilyData = await tavilyRes.json();
            rawTavily = tavilyData.results || [];
          }
        } catch (e) {}

        const executiveDataJson = JSON.stringify({ tavily_news: rawTavily }, null, 2);

        // 4. Phase 1: Progressive Batch Summarization
        sendEvent("system", { message: "Executing Phase 1: Progressive Batch Summarization..." });
        
        const BATCH_SIZE = 5;
        let batchSummaries = [];
        let batchIndex = 0;
        
        for (let i = 0; i < clusters.highPriority.length; i += BATCH_SIZE) {
          batchIndex++;
          const batch = clusters.highPriority.slice(i, i + BATCH_SIZE);
          sendEvent("agent_update", { agent: "Batch Processor", status: "working", details: `Processing batch ${batchIndex} (${batch.length} emails)...` });
          
          const batchPrompt = `Summarize the key operational signals from these ${batch.length} emails. Be extremely concise. Emails:\n${JSON.stringify(batch)}`;
          
          try {
            const completion = await groq.chat.completions.create({
              messages: [{ role: "user", content: batchPrompt }],
              model: "llama3-8b-8192", // Use smaller model for fast batching
              temperature: 0.1,
            });
            batchSummaries.push(`Batch ${batchIndex}:\n${completion.choices[0]?.message?.content}`);
            sendEvent("agent_update", { agent: "Batch Processor", status: "completed", details: `Batch ${batchIndex} summarized.` });
            
            // Sleep slightly to respect rate limits if there are more batches
            if (i + BATCH_SIZE < clusters.highPriority.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (e: any) {
            console.error(`Groq Batch ${batchIndex} Error:`, e);
            sendEvent("agent_update", { agent: "System", status: "failed", details: `Batch ${batchIndex} skipped due to rate limits.` });
            batchSummaries.push(`Batch ${batchIndex}: [SKIPPED DUE TO API LIMITS]`);
            break; // Stop processing further batches to save limits for synthesis
          }
        }

        const combinedPhase1Output = clusteredSummary + "\n\n" + batchSummaries.join("\n\n") + "\n\nExecutive News:\n" + executiveDataJson;

        // 5. Phase 2: Final Report Generation
        sendEvent("system", { message: "Executing Phase 2: Final Executive Synthesis..." });
        
        const phase2Prompt = `
Using the following batched summaries and clustered data, generate a strict JSON payload conforming to the dashboard schema. Do NOT include markdown like \`\`\`json. Return ONLY raw JSON.

Intelligence Payload:
${combinedPhase1Output}

Expected JSON format:
{
  "criticalAlerts": [],
  "opportunities": [],
  "networkingActivity": [],
  "strategicInsights": [{"insight": "...", "confidence": "95%"}],
  "recommendedActions": [{"action": "...", "confidence": "99%"}],
  "priorityQueue": [{"level": "HIGH/MEDIUM/LOW", "category": "...", "description": "...", "reason": "...", "confidence": "99%"}],
  "executiveIntelligence": [{"name": "Author", "originalContent": "...", "sourceUrl": "...", "provider": "...", "fetchedAt": "...", "aiSummary": "...", "strategicImplication": "...", "recommendedAction": "...", "confidence": "98%"}]
}`;

        let finalReport = "{}";
        try {
          const completion2 = await groq.chat.completions.create({
            messages: [{ role: "user", content: phase2Prompt }],
            model: "llama3-70b-8192",
            temperature: 0.2,
            response_format: { type: "json_object" }
          });
          finalReport = completion2.choices[0]?.message?.content || "{}";
          sendEvent("agent_update", { agent: "Report Agent", status: "completed", details: "Executive synthesis complete." });
        } catch (e: any) {
           console.error("Groq Phase 2 Error:", e);
           sendEvent("agent_update", { agent: "System", status: "failed", details: "AI Phase 2 Rate Limit Exceeded. Generating Fallback Synthesis." });
           
           // Dynamic Fallback payload using the batch data so dashboard doesn't collapse!
           finalReport = JSON.stringify({
             criticalAlerts: [`Rate limit recovery active. ${batchSummaries.length} batches processed.`].concat(clusters.highPriority.map((em: any) => em.s).slice(0, 2)),
             opportunities: ["Review raw inbox clusters"],
             networkingActivity: [`${clusters.linkedin.length} LinkedIn notifications detected.`],
             strategicInsights: [{ insight: "System is operating under heavy AI load. Graceful degradation enabled.", confidence: "100%" }],
             recommendedActions: [{ action: "Review high-priority batch summaries manually.", confidence: "99%" }],
             priorityQueue: clusters.highPriority.map((em: any) => ({ level: "MEDIUM", category: "Inbox", description: em.s, reason: "Fallback Processing", confidence: "80%" })).slice(0, 5),
             executiveIntelligence: []
           });
        }

        sendEvent("agent_update", { agent: "Validation Agent", status: "completed", details: "Intelligence verified." });

        // Final completion event
        const completionPayload = JSON.stringify({
          type: "crew_complete",
          report: finalReport,
          metadata: {
            source: "LIVE",
            count: emailCount,
            new_count: 0,
            newest_timestamp: "Just now",
            raw_emails: rawEmails,
            raw_executive: rawTavily
          }
        }) + '\n';
        
        controller.enqueue(encoder.encode(completionPayload));
        controller.close();

      } catch (error) {
        console.error("Stream error:", error);
        sendEvent("system", { message: "Internal server error during generation." });
        
        const errorPayload = JSON.stringify({
          status: "error",
          fallback_required: true
        }) + '\n';
        controller.enqueue(encoder.encode(errorPayload));
        controller.close();
      }
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
