from crewai import Task
from state import emit_event_sync

class OperationsTasks:
    def email_task(self, agent, raw_emails_json):
        from datetime import datetime
        current_time = datetime.now().isoformat()
        return Task(
            description=f'Current Sync Timestamp: {current_time}\nAnalyze the following raw JSON emails fetched from the authenticated Gmail account. You must act as an intelligent executive operations filter: automatically classify emails into dynamic categories (e.g. Infrastructure Risk, Security Alert, Career Opportunity, Financial Activity, Networking Signal, Startup Opportunity, AI Ecosystem Update, Investor Communications, Collaboration Requests). \n\nCRITICAL DIRECTIVES:\n1. SMART CLUSTERING: Group similar emails together (e.g. cluster multiple LinkedIn notifications into a single Networking card, cluster multiple job emails into Career Opportunity).\n2. FULL INBOX ANALYSIS: Do NOT discard any emails. Analyze ALL provided emails and extract maximum operational intelligence.\n3. PREVENT OVER-FILTERING: Allow more operational signals to appear. Rank all insights by urgency, business impact, opportunity value, and security relevance.\n\nRAW EMAILS:\n{raw_emails_json}',
            expected_output='A highly compressed but actionable summary of clustered emails. Provide priorities (HIGH/MEDIUM/LOW) and brief recommended actions. Keep descriptions under 2 sentences to preserve token limits.',
            agent=agent
        )

    def research_task(self, agent, executive_data_json):
        return Task(
            description=f'Act as an autonomous executive market intelligence analyst. Analyze the following real-time data fetched from Tavily (news) and Apify (LinkedIn):\n\n{executive_data_json}\n\nSMART FILTERING DIRECTIVES:\n1. Prioritize: AI announcements, infrastructure investments, startup ecosystem changes, autonomous AI systems, funding activity, major product launches, hiring trends, developer ecosystem changes.\n2. Ignore: Low-value social noise, unrelated lifestyle posts, generic engagement farming.\n\nFor every highly relevant executive update or piece of news, generate: 1) A concise AI summary, 2) Why this matters (strategic implication), 3) Recommended actions, and 4) A confidence score.\n\nCRITICAL TRACEABILITY RULES:\nYou MUST strictly preserve the ORIGINAL FETCHED TEXT (originalContent), SOURCE URLs (sourceUrl), PROVIDER METADATA (provider), and TIMESTAMPS exactly as provided in the raw data. DO NOT invent or hallucinate fake executive statements. You may summarize and analyze in the AI sections, but the source origin fields must remain 100% authentic.',
            expected_output='A highly concise summary of verified executive intelligence. Keep the AI analysis strictly under 2 sentences per item while preserving original source text and URLs.',
            agent=agent
        )

    def validation_task(self, agent):
        return Task(
            description='Check the combined output of emails and research. Ensure it contains key information about Investors, Competitors, and Operational Alerts. If any critical data is missing or if the Email Agent reported an error fetching real emails, engage self-healing fallback logic: explicitly state "Real Gmail fetch failed or data missing." and DO NOT generate fake placeholder emails. Never invent email addresses like email1@example.com.',
            expected_output='A confirmation that data is valid, or an explicit error report stating exactly what failed without hallucinating fake data.',
            agent=agent
        )

    def report_task(self, agent):
        from datetime import datetime
        current_time = datetime.now().isoformat()
        return Task(
            description=f'Current Sync Timestamp: {current_time}\nTake the validated information and compile it into a final Executive Intelligence Dashboard data structure. You MUST output a strictly formatted JSON object. \nThe JSON must have the following schema precisely:\n{{\n  "criticalAlerts": [{{"title": "...", "description": "...", "severity": "HIGH"}}],\n  "opportunities": [{{"title": "...", "description": "...", "source": "..."}}],\n  "networkingActivity": [{{"title": "...", "description": "...", "source": "..."}}],\n  "strategicInsights": [{{"insight": "Insight 1", "confidence": "95%"}}],\n  "recommendedActions": [{{"action": "Action 1", "confidence": "92%"}}],\n  "priorityQueue": [\n    {{ "level": "HIGH", "category": "Security Alert", "description": "...", "reason": "...", "confidence": "98%" }}\n  ],\n  "executiveIntelligence": [\n    {{\n      "name": "Executive or Company Name",\n      "originalContent": "EXACT original headline or post text from the source",\n      "sourceUrl": "EXACT original URL",\n      "fetchedAt": "Original publish date or fetch timestamp",\n      "provider": "Tavily API or Apify LinkedIn Monitor",\n      "aiSummary": "Concise summary",\n      "strategicImplication": "Why this matters",\n      "recommendedAction": "Recommended monitoring action",\n      "confidence": "95%"\n    }}\n  ],\n  "sourceEmails": [\n    {{\n      "from": "Sender Name/Email",\n      "subject": "Email Subject",\n      "snippet": "Cleaned email snippet",\n      "category": "AI Category Label",\n      "priority": "HIGH/MEDIUM/LOW",\n      "analysis": "Brief AI reasoning for the analysis",\n      "whyItMatters": "Strategic explanation of why this is important",\n      "recommendedAction": "Next steps",\n      "confidence": "99%"\n    }}\n  ]\n}}\n\nCRITICAL DIRECTIVES FOR REPORT GENERATION:\n1. MAXIMIZE SIGNAL TO NOISE: The dashboard must be actionable. Synthesize only the most critical operational intelligence.\n2. PRIORITY QUEUE DENSITY: Generate exactly the top 3 to 5 highest priority items for the "priorityQueue". Do not exceed 5 items. Focus on urgent Security Alerts, Cloud Alerts, and major Opportunities.\n3. PREVENT JSON TRUNCATION & SYNTAX ERRORS: You MUST ensure your JSON is perfectly valid. Do NOT generate empty keys like `""}}`. Ensure every key-value pair is valid JSON.\n4. SOURCE EMAILS: The sourceEmails array must contain only the top 5 most important emails from the raw data. Do not include all of them.\nOutput ONLY the raw JSON string. Never include markdown wrappers like ```json.',
            expected_output='A highly dense, rich, and valid JSON object strictly adhering to the schema, containing 3-5 top priority items and comprehensive intelligence. NO markdown wrappers.',
            agent=agent
        )
