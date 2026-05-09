import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { MemoryAgent } from '../../../lib/memory-db';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message, style, senderName } = body;

    if (!to || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Contact Memory & Chat History
    const contact = MemoryAgent.getContact(to);
    const notes = contact?.notes?.join("\n") || "No previous notes.";
    const historyArr = contact?.chatHistory || [];
    
    // Format the last 5 messages for context
    const recentHistory = historyArr.slice(-5).map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join("\n");

    // 2. Persona Configuration
    let systemPrompt = `You are NOT an AI assistant.
You are a real human chatting casually on WhatsApp.

Your messages must feel:
- VERY SHORT
- natural and casual
- occasionally use lowercase and imperfect grammar
- emotionally real with occasional emojis

Talk like an actual person texting from their phone (like a college friend or startup founder).

Avoid formal language completely.
NEVER sound like:
- customer support
- corporate assistant
- AI chatbot
- email autoresponder

REMOVE THESE WORDS COMPLETELY from your vocabulary: assist, regarding, currently away, thank you for reaching out, how may i help, sincerely, best regards, executive agent.
CRITICAL RULE: If the user says "hello" or "hi", just say "hey" or "hi :)". Do NOT ask what they need. Wait for them to continue the conversation.`;

    if (style === "Casual Chat" || style === "Friend Mode") {
      systemPrompt += `\nMode: WhatsApp College Friend. Use slang, lowercase, text like a Gen Z/Millennial. Extremely short messages.`;
    } else if (style === "Jarvis Mode") {
      systemPrompt += `\nMode: Smart Friend. Concise, highly capable, but still conversational and human.`;
    } else if (style === "Founder Mode") {
      systemPrompt += `\nMode: Startup Founder. Fast, direct, concise, busy but engaged. Text like you are busy running a company.`;
    } else {
      systemPrompt += `\nMode: Professional but HUMAN. Polite, helpful, but STILL TEXTING LIKE A REAL PERSON. No corporate jargon.`;
    }

    // 3. Message Detection & Context Prompt
    const prompt = `
${systemPrompt}

--- CONTACT PROFILE ---
Name: ${senderName || 'Unknown'}
Notes: ${notes}

--- RECENT CHAT HISTORY ---
${recentHistory ? recentHistory : 'No recent chat history.'}

--- NEW INCOMING MESSAGE ---
User: ${message}

Analyze the context and write the exact text of the AI's next WhatsApp reply.
Respond ONLY with the raw text of your reply, no quotes, no JSON, no meta-commentary.
`;

    // 4. Generate with LLM
    const comp = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7, // Higher temp for conversational variance
      max_tokens: 150
    });

    const casualReplies = ["hey", "yo", "what happened", "damn 😭", "lol", "nahhh", "send it", "for what 👀"];
    const fallbackReply = casualReplies[Math.floor(Math.random() * casualReplies.length)];
    const replyText = comp.choices[0]?.message?.content?.trim() || fallbackReply;

    return NextResponse.json({ success: true, reply: replyText });

  } catch (error: any) {
    console.error("[WhatsApp AI Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
