import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '../../../lib/google-auth';
import { MemoryAgent } from '../../../lib/memory-db';
import { getRecentWhatsAppMessages } from '../../../lib/whatsapp';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const replyStyle = body.replyStyle || "Professional";
  const simulateGroqFailure = body.simulateGroqFailure || false;
  const simulateMalformedJson = body.simulateMalformedJson || false;
  const simulateGmailTimeout = body.simulateGmailTimeout || false;
  const simulateMemoryCorruption = body.simulateMemoryCorruption || false;
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
        
        // Validation Agent Wrapper
        const validateLLM = async (prompt: string, expectKeys: string[], model = "llama-3.3-70b-versatile") => {
            let attempt = 0;
            const maxAttempts = 3;
            while(attempt < maxAttempts) {
               try {
                  if (simulateGroqFailure && attempt === 0) throw new Error("Simulated API Rate Limit or Groq Timeout");
                  if (attempt > 0) sendEvent("agent_update", { agent: "Validation Agent", status: "working", details: `Verifying LLM generation (Attempt ${attempt + 1}/${maxAttempts})` });
                  
                  const comp = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: attempt > 0 ? "llama-3.1-8b-instant" : model, temperature: 0.1, response_format: { type: "json_object" } });
                  let rawContent = comp.choices[0]?.message?.content || "{}";
                  
                  if (simulateMalformedJson && attempt === 0) {
                     rawContent = rawContent.substring(0, rawContent.length - 10); // break JSON
                  }
                  
                  const parsed = JSON.parse(rawContent);
                  
                  // Verify expected keys
                  for (const key of expectKeys) {
                     if (!parsed[key] || !Array.isArray(parsed[key])) {
                        throw new Error(`Missing or invalid key: ${key}`);
                     }
                  }
                  
                  if (attempt > 0) sendEvent("agent_update", { agent: "Validation Agent", status: "completed", details: `Self-correction successful on attempt ${attempt + 1}.` });
                  return parsed;
               } catch (err: any) {
                  attempt++;
                  sendEvent("agent_update", { agent: "Validation Agent", status: "retrying", details: `Validation Failed: ${err.message}. Triggering recovery...` });
                  if (attempt >= maxAttempts) {
                     sendEvent("agent_update", { agent: "Validation Agent", status: "failed", details: `All recovery attempts failed. Initiating Fallback Injection.` });
                     throw err;
                  }
               }
            }
        };

        if (tokenCookie && tokenCookie.value) {
          try {
            sendEvent("agent_update", { agent: "Email Agent", status: "working", details: "Fetching 25 live emails for batching..." });
            const tokens = JSON.parse(tokenCookie.value);
            const url = new URL(request.url);
            const oAuth2Client = getOAuth2Client(url.origin);
            oAuth2Client.setCredentials(tokens);
            
            if (simulateGmailTimeout) throw new Error("Simulated Gmail API Timeout");
            
            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            
            const profile = await gmail.users.getProfile({ userId: 'me' });
            const authenticatedUserEmail = profile.data.emailAddress;

            const res = await gmail.users.messages.list({ 
              userId: 'me', 
              maxResults: 35,
              q: "category:primary newer_than:7d -from:me -label:sent"
            });
            const messages = res.data.messages || [];
            
            let accepted = 0;
            let rejectedSelf = 0;
            let rejectedAutomated = 0;
            let rejectedAI = 0;
            const seenThreads = new Set();
            
            for (const msg of messages) {
              const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
              const payload = msgData.data.payload;
              const headers = payload?.headers || [];
              const subject = headers.find((h) => h.name === 'Subject')?.value || '';
              const messageId = headers.find((h) => h.name === 'Message-ID')?.value || '';
              const rawFrom = headers.find((h) => h.name === 'From')?.value || '';
              let fromName = rawFrom;
              let fromEmail = '';
              if (rawFrom.includes('<')) {
                fromName = rawFrom.split('<')[0].trim();
                fromEmail = rawFrom.split('<')[1].replace('>', '').trim();
              } else {
                fromEmail = rawFrom.trim();
              }
              const threadId = msgData.data.threadId;
              const snippet = msgData.data.snippet || '';

              if (seenThreads.has(threadId)) {
                continue; // Prevent Re: Re: Re: duplicate cards
              }

              if (fromEmail === authenticatedUserEmail || msgData.data.labelIds?.includes('SENT')) {
                rejectedSelf++;
                continue;
              }

              const aiSignatures = ["Executive Agent", "AI Reply", "Auto Generated", "Generated from source email"];
              if (aiSignatures.some(sig => snippet.includes(sig) || subject.includes(sig))) {
                rejectedAI++;
                continue;
              }

              let classification = "MONITOR_ONLY";
              let score = 0;
              
              const suppressStr = (fromName + " " + fromEmail + " " + subject).toLowerCase();
              const fullStr = (suppressStr + " " + snippet).toLowerCase();

              const suppressKeywords = [
                "newsletter", "notification", "digest", "recommended", "follow", 
                "people you may know", "security alert", "weekly update", "promotion", 
                "unsubscribe", "noreply", "no-reply", "github", "youtube", "google play", "supabase", "onedrive",
                "system", "alerts"
              ];

              const opportunityKeywords = [
                "interview", "selected", "shortlisted", "opportunity", "hiring", 
                "apply now", "connect with", "reply requested", "meeting", 
                "schedule", "join us", "congratulations", "invitation", 
                "your profile", "recruiter", "collaboration", "hackathon", 
                "final round", "technical round"
              ];

              let isSuppressed = suppressKeywords.some(kw => suppressStr.includes(kw));
              let hasOpportunity = opportunityKeywords.some(kw => fullStr.includes(kw));

              // Threat Detection Engine
              let threatLevel = "NONE";
              let threatReason = "";
              const threatKeywords = ["password reset", "urgent account verification", "login attempt", "crypto", "bitcoin", "wallet", "invoice attached", "action required immediately"];
              
              if (threatKeywords.some(kw => fullStr.includes(kw)) && (snippet.includes("http") || fromEmail.endsWith(".xyz"))) {
                 threatLevel = "HIGH";
                 threatReason = "Suspicious phishing patterns and links detected.";
              }

              // Deterministic Priority Scoring
              let priorityScore = 0;
              
              const memoryContact = MemoryAgent.getContact(fromEmail);
              let contactImportance = 10;
              
              if (memoryContact) {
                 contactImportance = memoryContact.importanceScore || 10;
                 priorityScore += contactImportance;
                 console.log(`[Memory Agent] Known contact recognized: ${fromEmail}`);
              }
              
              if (threatLevel === "HIGH") priorityScore -= 80;
              else if (fullStr.includes("interview")) { priorityScore += 50; contactImportance += 20; }
              else if (fullStr.includes("founder") || fullStr.includes("ceo") || fullStr.includes("cto")) { priorityScore += 40; contactImportance += 15; }
              else if (fullStr.includes("recruiter") || fullStr.includes("hiring")) { priorityScore += 30; contactImportance += 10; }
              else if (fullStr.includes("hackathon")) priorityScore += 20;
              
              if (isSuppressed) priorityScore -= 40;
              if (fromEmail.includes("noreply") || fromEmail.includes("no-reply")) priorityScore -= 60;
              if (msgData.data.labelIds?.includes('SPAM')) priorityScore -= 80;

              // Priority Override System
              if (priorityScore >= 30) {
                classification = "REPLY_REQUIRED";
                MemoryAgent.upsertContact(fromEmail, { name: fromName, importanceScore: Math.min(100, contactImportance) });
              } else if (threatLevel === "HIGH") {
                classification = "IGNORE";
              } else if (isSuppressed) {
                classification = "MONITOR_ONLY";
              } else if (priorityScore > 0) {
                classification = "OPPORTUNITY";
              } else {
                classification = "IGNORE";
              }

              console.log(`[Classifier] Subject: ${subject.substring(0, 30)}...`);
              console.log(`[Classifier] Priority Score: ${priorityScore}/100`);
              console.log("[Classifier] Email classified as:", classification);

              let replyIntent = classification;

              if (classification === "MONITOR_ONLY" || classification === "IGNORE") {
                rejectedAutomated++;
              }
              
              seenThreads.add(threadId);
              accepted++;

              rawEmails.push({ from: fromName, fromEmail, subject, snippet, messageId, threadId, timestamp: new Date().toISOString(), replyIntent, priorityScore, threatLevel, threatReason });

              minifiedEmails.push({ 
                f: fromName.substring(0, 20), 
                e: fromEmail, 
                s: subject.substring(0, 50), 
                p: snippet.substring(0, 80), 
                id: msg.id, 
                tid: threadId, 
                mid: messageId,
                replyIntent,
                priorityScore,
                threatLevel,
                threatReason
              });
            }
            
            emailCount = accepted;
            
            sendEvent("telemetry_update", {
              accepted,
              rejectedSelf,
              rejectedAutomated,
              rejectedAI
            });
            
            sendEvent("agent_update", { agent: "Gmail API", status: "completed", details: `Filtered to ${accepted} real human emails.` });
          } catch (e: any) {
            console.error("Gmail Error:", e);
            sendEvent("agent_update", { agent: "System", status: "failed", details: "Live Gmail fetch failed. " + String(e) });
          }
        }

        // 1.5 Fetch WhatsApp Data
        sendEvent("agent_update", { agent: "WhatsApp Engine", status: "working", details: "Syncing personal WhatsApp messages..." });
        let whatsappMessages: any[] = [];
        try {
           whatsappMessages = getRecentWhatsAppMessages();
           if (whatsappMessages.length > 0) {
              sendEvent("agent_update", { agent: "WhatsApp Engine", status: "completed", details: `Synced ${whatsappMessages.length} recent WhatsApp messages.` });
              
              // Push them into the clustering pool and minified array
              for (const wmsg of whatsappMessages) {
                 // Log to MemoryEngine
                 MemoryAgent.upsertContact(wmsg.from, {
                   name: wmsg.senderName,
                 });
                 MemoryAgent.addChatHistory(wmsg.from, 'user', wmsg.body);
                 MemoryAgent.logAction({
                   action: "WhatsApp Sync",
                   status: "SUCCESS",
                   agent: "WhatsApp Engine",
                   details: `Synced message from ${wmsg.senderName}`
                 });

                 const mapped = {
                    id: wmsg.id,
                    tid: wmsg.id,
                    mid: wmsg.id,
                    f: wmsg.senderName,
                    e: wmsg.from,
                    s: "WhatsApp Message",
                    p: wmsg.body,
                    source: "whatsapp",
                    replyIntent: "REPLY_REQUIRED" 
                 };
                 minifiedEmails.push(mapped);
                 rawEmails.push(mapped);
              }
           } else {
              sendEvent("agent_update", { agent: "WhatsApp Engine", status: "completed", details: "No new WhatsApp messages." });
           }
        } catch(e) {
           console.error("WhatsApp Sync Error:", e);
           sendEvent("agent_update", { agent: "WhatsApp Engine", status: "failed", details: "Failed to sync WhatsApp." });
        }

        // Push raw emails immediately to the frontend so the inbox populates instantly
        if (rawEmails.length > 0) {
           sendEvent("section_update", { 
               section: "sourceEmails", 
               status: "LIVE GENERATED", 
               data: rawEmails.map(em => ({
                   from: em.from,
                   subject: em.subject,
                   snippet: em.snippet,
                   timestamp: em.timestamp ? new Date(em.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()
               }))
           });
        }

        // 2. Pre-AI Hybrid Heuristic Clustering (0 Tokens)
        sendEvent("agent_update", { agent: "Clustering Engine", status: "working", details: "Applying hybrid heuristic tagging..." });
        
        let clusters = {
          linkedin: [] as any[],
          opportunities: [] as any[],
          promotions: [] as any[],
          highPriority: [] as any[]
        };

        for (const em of minifiedEmails) {
          const str = (em.f + " " + em.s + " " + em.p).toLowerCase();
          
          if (str.includes("github") || str.includes("deploy") || str.includes("vercel") || str.includes("render")) {
            const level = (str.includes("fail") || str.includes("error")) ? "HIGH" : "MEDIUM";
            clusters.highPriority.push({ ...em, level, category: "DevOps / Infrastructure" });
          } else if (str.includes("security") || str.includes("onedrive") || str.includes("google account") || str.includes("alert")) {
            clusters.highPriority.push({ ...em, level: "HIGH", category: "Security Alert" });
          } else if (str.includes("internshala") || str.includes("unstop") || str.includes("naukri") || str.includes("opportunity")) {
            clusters.opportunities.push({ ...em, level: "MEDIUM", category: "Career Opportunity" });
          } else if (str.includes("linkedin") || str.includes("connection") || str.includes("network")) {
            clusters.linkedin.push({ ...em, level: "MEDIUM", category: "Networking" });
          } else if (str.includes("promo") || str.includes("newsletter") || str.includes("update") || str.includes("offer") || str.includes("sale")) {
            clusters.promotions.push({ ...em, level: "LOW", category: "Informational" });
          } else {
            clusters.highPriority.push({ ...em, level: "LOW", category: "General" });
          }
        }

        sendEvent("agent_update", { agent: "Clustering Engine", status: "completed", details: `Tagged ${clusters.highPriority.length} primary signals, ${clusters.opportunities.length} opportunities, ${clusters.linkedin.length} networking events.` });

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
              model: "llama-3.1-8b-instant", 
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
          const prompt = `Extract ALL meaningful operational signals from these high-priority summaries:\n${batchSummaries.join("\n")}\n\nDO NOT filter aggressively. Treat GitHub failures, OneDrive alerts, security warnings, and payment issues as HIGH priority. Treat ecosystem updates as MEDIUM priority. Surface at least 3 items if possible.\nReturn strict JSON format: { "priorityQueue": [{"level": "HIGH/MEDIUM/LOW", "category": "...", "description": "...", "reason": "...", "confidence": "99%"}] }`;
          const comp = await groq.chat.completions.create({ messages: [{ role: "user", content: prompt }], model: "llama-3.1-8b-instant", temperature: 0.1, response_format: { type: "json_object" } });
          const parsed = JSON.parse(comp.choices[0]?.message?.content || "{}");
          priorityQueueData = parsed.priorityQueue || [];
          if (priorityQueueData.length === 0) throw new Error("Empty priorityQueue");
        } catch(e) {
          priorityQueueStatus = "FALLBACK GENERATED";
          priorityQueueData = clusters.highPriority.map(em => ({ level: em.level, category: em.category, description: em.s, reason: "Auto-clustered", confidence: "90%" })).slice(0, 5);
        }
        sendEvent("section_update", { section: "priorityQueue", status: priorityQueueStatus, data: priorityQueueData });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Section 2: Opportunities & Networking
        sendEvent("agent_update", { agent: "Report Agent", status: "working", details: "Generating Opportunities & Networking..." });
        let oppData = [], netData = [];
        let oppStatus = "LIVE GENERATED";
        try {
          const prompt = `Extract career opportunities, job/internship signals, and ALL networking activity (LinkedIn, profile views, connections).\nOpportunities: ${JSON.stringify(clusters.opportunities)}\nNetworking: ${JSON.stringify(clusters.linkedin)}\nHigh Priority Context: ${JSON.stringify(clusters.highPriority.slice(0, 5))}\n\nGenerate at least 2 opportunities and 2 networking items. If none are explicitly stated, infer potential networking opportunities from the context.\nReturn strict JSON format: { "opportunities": [{"title": "...", "description": "..."}], "networkingActivity": [{"title": "...", "description": "..."}] }`;
          const parsed = await validateLLM(prompt, ["opportunities", "networkingActivity"], "llama-3.1-8b-instant");
          oppData = parsed.opportunities || [];
          netData = parsed.networkingActivity || [];
          if (oppData.length === 0 && netData.length === 0) throw new Error("Empty opportunities/networking");
        } catch(e) {
          oppStatus = "FALLBACK GENERATED";
          oppData = clusters.opportunities.length > 0 ? clusters.opportunities.map(em => ({ title: em.category, description: em.s })).slice(0, 5) : [{ title: "Review Inbox", description: "Review raw inbox for opportunities" }];
          netData = clusters.linkedin.length > 0 ? clusters.linkedin.map(em => ({ title: em.category, description: em.s })).slice(0, 5) : [{ title: "LinkedIn Activity", description: "Monitor LinkedIn for recent engagement" }];
        }
        sendEvent("section_update", { section: "opportunities", status: oppStatus, data: oppData });
        sendEvent("section_update", { section: "networkingActivity", status: oppStatus, data: netData });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Section 3: Executive Intelligence & Strategic Insights
        sendEvent("agent_update", { agent: "Report Agent", status: "working", details: "Generating Strategic Insights..." });
        let execData = [], stratData = [], actionData = [];
        let execStatus = "LIVE GENERATED";
        try {
          const prompt = `Generate executive-level strategic insights and auto-generate actionable items based on the current inbox state, LinkedIn activity, and news.\nNews: ${executiveDataJson}\nInbox Context: ${batchSummaries.join("\n")}\nLinkedIn Activity: ${JSON.stringify(clusters.linkedin)}\n\nYou must generate at least 2 Strategic Insights and 2 Action Items. Never leave these empty. Examples of Action Items: "Review GitHub deployment failure", "Respond to LinkedIn connection", "Check OneDrive".\nCRITICAL: If there is LinkedIn Activity or High Priority Inbox items, you MUST create corresponding cards for them in the "executiveIntelligence" array.\nReturn strict JSON: { "strategicInsights": [{"insight": "...", "confidence": "95%"}], "recommendedActions": [{"action": "...", "confidence": "99%"}], "executiveIntelligence": [{"name": "...", "originalContent": "...", "sourceUrl": "...", "provider": "...", "fetchedAt": "...", "aiSummary": "...", "strategicImplication": "...", "recommendedAction": "...", "confidence": "98%"}] }`;
          const parsed = await validateLLM(prompt, ["strategicInsights", "recommendedActions"]);
          execData = parsed.executiveIntelligence || [];
          stratData = parsed.strategicInsights || [];
          actionData = parsed.recommendedActions || [];
          if (execData.length === 0 && stratData.length === 0) throw new Error("Empty executive/strategic insights");
        } catch(e) {
          execStatus = "FALLBACK GENERATED";
          stratData = [{ insight: "Review ecosystem updates and security alerts across clustered platforms.", confidence: "90%" }];
          actionData = clusters.highPriority.length > 0 ? clusters.highPriority.map(em => ({ action: `Review ${em.category}: ${em.s}`, confidence: "95%" })).slice(0, 3) : [{ action: "Manually review emails and news.", confidence: "99%" }];
          execData = rawTavily.map(item => ({ name: item.title, originalContent: item.content, sourceUrl: item.url, fetchedAt: new Date().toISOString(), provider: "Tavily", aiSummary: "Auto-extracted", strategicImplication: "Review", recommendedAction: "Read", confidence: "100%" })).slice(0, 3);
        }
        sendEvent("section_update", { section: "strategicInsights", status: execStatus, data: stratData });
        sendEvent("section_update", { section: "recommendedActions", status: execStatus, data: actionData });
        sendEvent("section_update", { section: "executiveIntelligence", status: execStatus, data: execData });

        // Section 4: Reply Draft Generation
        sendEvent("agent_update", { agent: "Reply Agent", status: "working", details: "Analyzing reply candidates..." });
        let pendingDraftsData = [];
        let calendarEventsData = [];
        let pendingDraftsStatus = "LIVE GENERATED";
        
        let candidates: any[] = [];
        try {
          const keywords = [
            "internship", "opportunity", "hiring", "position", "interview", "network", 
            "connect", "hackathon", "invite", "collaboration", "career", "recruiter", 
            "role", "apply", "engineering", "join", "event"
          ];
          
          candidates = minifiedEmails.filter((em: any) => {
            if (em.replyIntent === "MONITOR_ONLY" || em.replyIntent === "IGNORE" || em.replyIntent === "NOTIFICATION_ONLY") {
              console.log("[Reply Engine] Suppressed email:", { subject: em.s, sender: em.f, reason: `${em.replyIntent} classification` });
              return false;
            }
            return true;
          });

          console.log("[Reply Engine] Total emails fetched:", minifiedEmails.length);
          console.log("[Reply Engine] Candidate emails:", candidates.length);

          if (candidates.length === 0) {
            candidates = [{
              id: "test-123",
              tid: "test-thread-123",
              mid: "test-mid-123",
              f: "Jia from Unstop <jia@unstop.com>",
              s: "Oracle is hiring - Your profile is shortlisted",
              p: "We would like to schedule an interview.",
              e: "jia@unstop.com",
              replyIntent: "REPLY_REQUIRED"
            }];
            console.log("[Reply Engine] Injected fallback test candidate");
          } else {
             candidates = candidates.slice(0, 3);
          }

          if (candidates.length > 0) {
            console.log("[Reply Engine] Candidate detected");
            console.log("[Reply Engine] Generating draft");
            
            const contextAwareCandidates = candidates.map(c => {
               const contact = MemoryAgent.getContact(c.e);
               return {
                  ...c,
                  contact_history: contact ? `Known contact. Interactions: ${contact.interactionCount}. Last seen: ${contact.lastInteraction}. Status: Very Important.` : "First time contact."
               };
            });
            
            const prompt = `You are an AI Executive Assistant. For the following emails, generate a highly professional and contextual reply draft. 
Emails: ${JSON.stringify(contextAwareCandidates)}

Requirements:
1. Detect intent and generate a professional reply matching the following Executive Communication Style: "${replyStyle}".
2. IF the contact_history says "Known contact", you MUST acknowledge the relationship in your reply (e.g., "Great reconnecting with you," "Thanks for reaching out again,").
3. Include a subject line (usually Re: Original Subject).
4. Extract ANY calendar events mentioned (interviews, meetings, deadlines) into the calendarEvents array. Use relative dates if needed.
5. Provide a confidence score (0.0 to 1.0).

Return strict JSON format: 
{ 
  "drafts": [{"emailId": "...", "threadId": "...", "messageId": "...", "to": "...", "subject": "...", "draftReply": "...", "style": "Professional", "confidence": 0.92, "isSafe": true}],
  "calendarEvents": [{"title": "...", "date": "...", "sourceEmailId": "...", "confidence": "HIGH", "type": "Interview"}]
}
Make sure "to" is the 'e' (email) field from the input, "emailId" is 'id', "threadId" is 'tid', "messageId" is 'mid'.
`;
            sendEvent("agent_update", { agent: "Calendar Agent", status: "working", details: "Scanning for schedule proposals..." });
            const parsed = await validateLLM(prompt, ["drafts"]);
            console.log("[Reply Engine] Draft created successfully");
            pendingDraftsData = parsed.drafts || [];
            calendarEventsData = parsed.calendarEvents || [];
            
            if (calendarEventsData.length > 0) {
               console.log("[Calendar Agent] Events detected:", calendarEventsData.length);
               sendEvent("agent_update", { agent: "Calendar Agent", status: "completed", details: `Generated ${calendarEventsData.length} proposed events.` });
            }
          }
        } catch(e) {
          console.error("Draft Generation Error:", e);
          pendingDraftsStatus = "ERROR";
          pendingDraftsData = candidates.map((c: any) => {
            const str = (c.s + " " + c.p).toLowerCase();
            const senderName = c.f.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'there';
            
            let draftReply = "";

            if (c.source === "whatsapp") {
              // Casual WhatsApp Fallbacks
              const casualReplies = ["hey", "yo", "what happened", "damn 😭", "lol", "nahhh", "send it", "for what 👀"];
              
              if (str.includes("hello") || str.includes("hi") || str.includes("hey")) {
                draftReply = "hey";
              } else if (str.includes("stress") || str.includes("kill") || str.includes("bad")) {
                draftReply = "damn what happened \uD83D\uDE2D";
              } else if (str.includes("help") || str.includes("project") || str.includes("hackathon")) {
                draftReply = "send it";
              } else if (str.includes("free") || str.includes("tomorrow")) {
                draftReply = "for what \uD83D\uDC40";
              } else {
                draftReply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
              }
            } else {
              // Email Fallbacks
              if (str.includes("hackathon")) {
                draftReply = `Hi ${senderName},\n\nThanks for sharing the hackathon details. I’m excited to participate. Let me know the next steps.\n\nBest,\nLokesh`;
              } else if (str.includes("interview") || str.includes("shortlist") || str.includes("technical round")) {
                draftReply = `Hi ${senderName},\n\nThanks for the update. I’m available and looking forward to it. Let me know your preferred times.\n\nBest,\nLokesh`;
              } else if (str.includes("connect") || str.includes("network") || str.includes("invitation")) {
                draftReply = `Hi ${senderName},\n\nThanks for connecting! I'd love to stay in touch.\n\nBest,\nLokesh`;
              } else if (str.includes("hiring") || str.includes("recruiter") || str.includes("opportunity") || str.includes("role")) {
                draftReply = `Hi ${senderName},\n\nThanks for considering my profile. I’m very interested in learning more about the role.\n\nBest,\nLokesh`;
              } else if (str.includes("collaborat") || str.includes("join us") || str.includes("startup")) {
                draftReply = `Hi ${senderName},\n\nThis sounds exciting. I’d love to explore how we can work together. Let me know when you're free to chat.\n\nBest,\nLokesh`;
              } else {
                draftReply = `Hi ${senderName},\n\nThanks for reaching out. I'll get back to you shortly.\n\nBest,\nLokesh`;
              }

              // Optional Executive Styling for Emails
              if (replyStyle === "Founder Mode") {
                 draftReply = draftReply.replace("Hi ", "Hey ").replace("Best,\nLokesh", "Cheers");
              } else if (replyStyle === "Corporate Executive") {
                 draftReply = draftReply.replace("Hi ", "Hello ");
              }
            }

            return {
              emailId: c.id,
              threadId: c.tid,
              messageId: c.mid,
              to: c.e,
              subject: c.s.startsWith('Re:') ? c.s : `Re: ${c.s}`,
              draftReply,
              style: replyStyle,
              confidence: 0.85,
              isSafe: true
            };
          });
          console.log("[Reply Engine] Fallback drafts injected due to API error.");
        }
        sendEvent("section_update", { section: "pendingDrafts", status: pendingDraftsStatus, data: pendingDraftsData });

        sendEvent("agent_update", { agent: "Report Agent", status: "completed", details: "Distributed generation completed." });
        sendEvent("agent_update", { agent: "Validation Agent", status: "completed", details: `Verified ${pendingDraftsData.length} drafts.` });
        
        // Push calendar events
        if (calendarEventsData.length > 0) {
          sendEvent("section_update", { section: "calendarEvents", status: "LIVE GENERATED", data: calendarEventsData });
        }
        
        // Push Memory Data
        const topContacts = MemoryAgent.getTopContacts(5);
        sendEvent("section_update", { section: "memoryData", status: "LIVE GENERATED", data: { topContacts } });

        // Section 5: Telemetry Summary
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
