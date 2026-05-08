import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '../../../lib/google-auth';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  
  const customReadable = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        const payload = JSON.stringify({ type, data }) + '\n';
        controller.enqueue(encoder.encode(payload));
      };

      try {
        sendEvent("crew_start", { message: "Starting Distributed Micro-Generation Pipeline." });

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
        sendEvent("agent_update", { agent: "Clustering Engine", status: "working", details: "Applying heuristic clustering..." });
        
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

        sendEvent("agent_update", { agent: "Clustering Engine", status: "completed", details: `Isolated ${clusters.highPriority.length} high-priority signals.` });

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
          sendEvent("agent_update", { agent: "Batch Processor", status: "working", details: `Summarizing batch ${batchIndex} (${batch.length} emails)...` });
          
          const batchPrompt = `Summarize the key operational signals from these ${batch.length} emails. Be extremely concise. Emails:\n${JSON.stringify(batch)}`;
          
          try {
            const completion = await groq.chat.completions.create({
              messages: [{ role: "user", content: batchPrompt }],
              model: "llama3-8b-8192", 
              temperature: 0.1,
            });
            batchSummaries.push(`Batch ${batchIndex}:\n${completion.choices[0]?.message?.content}`);
            sendEvent("agent_update", { agent: "Batch Processor", status: "completed", details: `Batch ${batchIndex} summarized.` });
            if (i + BATCH_SIZE < clusters.highPriority.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } catch (e: any) {
            console.error(`Groq Batch ${batchIndex} Error:`, e);
            sendEvent("agent_update", { agent: "System", status: "failed", details: `Batch ${batchIndex} skipped due to API limits.` });
            break; 
          }
        }

        // 5. Distributed Micro-Generation (Phase 2 Replacement)
        sendEvent("system", { message: "Initiating Distributed Sectional Rendering..." });

        // Section 1: Priority Queue
        sendEvent("agent_update", { agent: "Report Agent", status: "working", details: "Generating Priority Queue..." });
        let priorityQueueData = [];
        let priorityQueueStatus = "LIVE GENERATED";
        try {
          const prompt = `Extract priority queue items from these high-priority summaries:\n${batchSummaries.join("\n")}\n\nReturn strict JSON format: { "priorityQueue": [{"level": "HIGH/MEDIUM/LOW", "category": "...", "description": "...", "reason": "...", "confidence": "99%"}] }`;
          const comp = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: "llama3-8b-8192", temperature: 0.1, response_format: { type: "json_object" } });
          const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
          priorityQueueData = parsed.priorityQueue || [];
          if (priorityQueueData.length === 0) throw new Error("Empty priorityQueue");
        } catch(e) {
          priorityQueueStatus = "FALLBACK GENERATED";
          priorityQueueData = clusters.highPriority.map(em => ({ level: "MEDIUM", category: "Inbox", description: em.s, reason: "Auto-clustered", confidence: "90%" })).slice(0, 5);
        }
        sendEvent("section_update", { section: "priorityQueue", status: priorityQueueStatus, data: priorityQueueData });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Section 2: Opportunities & Networking
        sendEvent("agent_update", { agent: "Report Agent", status: "working", details: "Generating Opportunities & Networking..." });
        let oppData = [], netData = [];
        let oppStatus = "LIVE GENERATED";
        try {
          const prompt = `Extract opportunities and networking activity from these clustered emails:\n${JSON.stringify(clusters.linkedin)}\n${JSON.stringify(clusters.highPriority)}\n\nReturn strict JSON format: { "opportunities": ["..."], "networkingActivity": ["..."] }`;
          const comp = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: "llama3-8b-8192", temperature: 0.1, response_format: { type: "json_object" } });
          const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
          oppData = parsed.opportunities || [];
          netData = parsed.networkingActivity || [];
          if (oppData.length === 0 && netData.length === 0) throw new Error("Empty opportunities/networking");
        } catch(e) {
          oppStatus = "FALLBACK GENERATED";
          oppData = ["Review raw inbox for opportunities"];
          netData = clusters.linkedin.map(em => em.s).slice(0, 5);
        }
        sendEvent("section_update", { section: "opportunities", status: oppStatus, data: oppData });
        sendEvent("section_update", { section: "networkingActivity", status: oppStatus, data: netData });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Section 3: Executive Intelligence & Strategic Insights
        sendEvent("agent_update", { agent: "Report Agent", status: "working", details: "Generating Strategic Insights..." });
        let execData = [], stratData = [], actionData = [];
        let execStatus = "LIVE GENERATED";
        try {
          const prompt = `Extract strategic insights, action items, and executive intelligence from:\nNews: ${executiveDataJson}\nSummaries: ${batchSummaries.join("\n")}\n\nReturn strict JSON: { "strategicInsights": [{"insight": "...", "confidence": "95%"}], "recommendedActions": [{"action": "...", "confidence": "99%"}], "executiveIntelligence": [{"name": "...", "originalContent": "...", "sourceUrl": "...", "provider": "...", "fetchedAt": "...", "aiSummary": "...", "strategicImplication": "...", "recommendedAction": "...", "confidence": "98%"}] }`;
          const comp = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: "llama3-70b-8192", temperature: 0.1, response_format: { type: "json_object" } });
          const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
          execData = parsed.executiveIntelligence || [];
          stratData = parsed.strategicInsights || [];
          actionData = parsed.recommendedActions || [];
          if (execData.length === 0 && stratData.length === 0) throw new Error("Empty executive/strategic insights");
        } catch(e) {
          execStatus = "FALLBACK GENERATED";
          stratData = [{ insight: "Rate limit prevented full AI synthesis.", confidence: "100%" }];
          actionData = [{ action: "Manually review emails and news.", confidence: "99%" }];
          execData = rawTavily.map(item => ({ name: item.title, originalContent: item.content, sourceUrl: item.url, fetchedAt: new Date().toISOString(), provider: "Tavily", aiSummary: "Auto-extracted", strategicImplication: "Review", recommendedAction: "Read", confidence: "100%" })).slice(0, 3);
        }
        sendEvent("section_update", { section: "strategicInsights", status: execStatus, data: stratData });
        sendEvent("section_update", { section: "recommendedActions", status: execStatus, data: actionData });
        sendEvent("section_update", { section: "executiveIntelligence", status: execStatus, data: execData });

        sendEvent("agent_update", { agent: "Validation Agent", status: "completed", details: "Sectional rendering complete." });

        // Final completion event (no monolithic report needed anymore)
        const completionPayload = JSON.stringify({
          type: "crew_complete",
          metadata: {
            source: "LIVE",
            count: emailCount,
            new_count: 0,
            newest_timestamp: rawEmails.length > 0 ? rawEmails[0].timestamp : "Unknown",
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
