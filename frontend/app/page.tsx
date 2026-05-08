"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Play, CheckCircle, Clock, AlertCircle, Mail, Newspaper, FileText, Activity, ShieldAlert, Briefcase, Zap, Target, TrendingUp, Lightbulb, Users, Navigation, Inbox, X, ChevronRight, Globe } from "lucide-react";

interface AgentStatus {
  agent: string;
  status: "idle" | "working" | "completed";
  details: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [agentUpdates, setAgentUpdates] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [dataSource, setDataSource] = useState<'LIVE' | 'DEMO' | 'PENDING'>('PENDING');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [newEmailCount, setNewEmailCount] = useState<number | null>(null);
  const [newestEmailTime, setNewestEmailTime] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    // Check initial auth status
    fetch(`${API_URL}/auth/status`)
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setIsAuthenticated(true);
      })
      .catch(err => console.error(err));

    // Check for success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth") === "success") {
      setIsAuthenticated(true);
      setAgentUpdates([{ type: "system", data: { agent: "OAuth Service", message: "Google authentication successful!" } }]);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Autonomous polling is handled by the isStale useEffect below

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lastSyncTimestamp && !isGenerating && dataSource === 'LIVE') {
      interval = setInterval(() => {
        if (Date.now() - lastSyncTimestamp > 60000) {
          setIsStale(true);
        } else {
          setIsStale(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lastSyncTimestamp, isGenerating, dataSource]);

  useEffect(() => {
    if (isStale && !isGenerating && isAuthenticated && isAutonomous) {
      console.log("Data is stale. Triggering automatic hard refresh...");
      handleGenerateReport();
    }
  }, [isStale, isGenerating, isAuthenticated, isAutonomous]);

  const agents = [
    { id: "Manager Agent", icon: <BrainCircuit size={20} />, role: "Orchestrator" },
    { id: "Email Agent", icon: <Mail size={20} />, role: "Inbox Processing" },
    { id: "Research Agent", icon: <Newspaper size={20} />, role: "Market Intel" },
    { id: "Validation Agent", icon: <CheckCircle size={20} />, role: "Quality Assurance" },
    { id: "Report Agent", icon: <FileText size={20} />, role: "Report Generation" }
  ];

  const getAgentState = (agentId: string) => {
    const updates = agentUpdates.filter(u => u.data.agent === agentId);
    if (updates.length === 0) return "idle";
    return updates[updates.length - 1].data.status;
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setAgentUpdates([{ type: "system", data: { agent: "OAuth Service", message: "Redirecting to Google for authentication..." } }]);
    
    try {
      const response = await fetch(`${API_URL}/auth/login`);
      const data = await response.json();
      if (data.status === "success" && data.url) {
        window.location.href = data.url;
      } else {
        setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "OAuth Service", message: "Failed to get auth URL: " + data.message } }]);
        setIsAuthenticating(false);
      }
    } catch (err) {
      console.error(err);
      setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "OAuth Service", message: "Failed to connect to authentication server." } }]);
      setIsAuthenticating(false);
    }
  };

  const generateFallbackDemoData = () => {
    return JSON.stringify({
      criticalAlerts: [{ title: "API Rate Limit Imminent", description: "Approaching 90% quota on main AI inference endpoint.", severity: "HIGH" }],
      opportunities: [{ title: "Senior AI Engineer Follow-up", description: "Candidate from Stanford responded to outreach.", source: "LinkedIn" }],
      networkingActivity: [{ title: "Founders Fund Partner", description: "Viewed your company profile on PitchBook." }],
      strategicInsights: [
        { insight: "Recruitment activity is yielding high engagement from top-tier candidates.", confidence: "94%" },
        { insight: "Infrastructure alerts indicate scaling needs sooner than projected.", confidence: "89%" }
      ],
      recommendedActions: [
        { action: "Schedule interview with AI candidate", confidence: "98%" },
        { action: "Upgrade inference endpoints to avoid downtime", confidence: "100%" }
      ],
      priorityQueue: [
        { level: "HIGH", category: "Infrastructure Risk", description: "Database connections nearing max pool size.", reason: "Could cause downtime during peak hours.", confidence: "99%" },
        { level: "MEDIUM", category: "Career Opportunity", description: "Follow-up email received from top AI candidate.", reason: "Key hire for Q3 roadmap.", confidence: "95%" }
      ],
      sourceEmails: [
        { from: "AWS Alerts <no-reply-aws@amazon.com>", subject: "ALARM: DBConnectionLimit_High", snippet: "Your RDS instance startup-db-prod is approaching the maximum connection limit. Current connections: 1942.", category: "Infrastructure Risk", priority: "HIGH", analysis: "Critical database scaling threshold reached.", whyItMatters: "Failure to address this immediately will result in complete application downtime.", recommendedAction: "Provision read replicas or increase instance size immediately.", confidence: "100%" },
        { from: "Sarah Jenkins <s.jenkins@stanford.edu>", subject: "Re: Machine Learning Lead Role", snippet: "Hi, I'm very interested in the position. Would love to chat this Thursday.", category: "Career Opportunity", priority: "MEDIUM", analysis: "High-priority candidate responded positively.", whyItMatters: "Hiring this candidate is a major operational milestone.", recommendedAction: "Reply and schedule the interview for Thursday.", confidence: "95%" }
      ],
      executiveIntelligence: [
        {
          name: "Sundar Pichai",
          originalContent: "Google announces new AI infrastructure investments, marking a 50% increase in CAPEX for the next quarter.",
          sourceUrl: "https://finance.yahoo.com/news/google-ai-infrastructure",
          provider: "Tavily API",
          fetchedAt: "2026-05-07T08:30:00Z",
          aiSummary: "Alphabet is ramping up CAPEX for Gemini data centers.",
          strategicImplication: "Google increasing AI infrastructure investments may intensify competition in enterprise AI tooling.",
          recommendedAction: "Monitor GCP pricing changes.",
          confidence: "98%"
        },
        {
          name: "Sam Altman",
          originalContent: "We are excited to share a sneak peek of our upcoming autonomous agentic workflows.",
          sourceUrl: "https://linkedin.com/in/samaltman/post/123456789",
          provider: "Apify LinkedIn Monitor",
          fetchedAt: "2026-05-07T06:15:00Z",
          aiSummary: "OpenAI's latest post hints at an autonomous agents framework.",
          strategicImplication: "This directly impacts our product roadmap and value proposition.",
          recommendedAction: "Accelerate autonomous features development.",
          confidence: "95%"
        }
      ]
    });
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setReport(null);
    setAgentUpdates([]);

    try {
      const response = await fetch(`${API_URL}/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_request: "Generate Daily Startup Report" })
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalData = null;

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsedData = JSON.parse(line);
              if (parsedData.type === "agent_update" || parsedData.type === "system") {
                setAgentUpdates((prev) => [...prev, parsedData]);
              } else if (parsedData.type === "crew_complete" || parsedData.report) {
                finalData = parsedData;
              }
            } catch (e) {
              console.warn("Failed to parse stream line:", line);
            }
          }
        }
      }

      const data = finalData || { status: "error", fallback_required: true };
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      if (data.status === "error" || data.fallback_required) {
        console.warn("Backend error, displaying raw live data without AI analysis");
        setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "System", message: "System Alert: AI analysis pipeline failed (rate limits/parsing). Displaying raw live inbox data." } }]);
        
        let fallbackDataObj: any = {
          criticalAlerts: [],
          opportunities: [],
          networkingActivity: [],
          strategicInsights: [],
          recommendedActions: [],
          priorityQueue: [
            {
              level: "HIGH",
              category: "System Error",
              description: "AI Analysis Pipeline Failed",
              reason: "Rate limits exceeded or AI parsing failed. Displaying unanalyzed raw data below.",
              confidence: "100%"
            }
          ],
          sourceEmails: [],
          executiveIntelligence: []
        };
        
        // If we rescued real emails, inject them!
        if (data.rescued_emails && data.rescued_emails.length > 0) {
            fallbackDataObj.sourceEmails = data.rescued_emails.map((email: any) => ({
                from: email.from,
                subject: email.subject,
                snippet: email.snippet,
                category: "Raw Data",
                priority: "LOW",
                analysis: "Raw email. AI analysis unavailable due to rate limits.",
                whyItMatters: "Fetched directly from inbox.",
                recommendedAction: "Review manually.",
                confidence: "100%"
            }));
            setEmailCount(data.rescued_emails.length);
        } else {
            setEmailCount(0);
        }

        // Also inject raw executive intelligence if available
        if (data.rescued_executive && data.rescued_executive.length > 0) {
            fallbackDataObj.executiveIntelligence = data.rescued_executive.map((item: any) => ({
                name: item.author || item.title || "Executive Intelligence",
                originalContent: item.text || item.content || "Content unavailable",
                sourceUrl: item.postUrl || item.url || "#",
                fetchedAt: item.publishedAt || item.published_date || "Recent",
                provider: item.provider || "System API",
                aiSummary: "Raw intelligence retrieved.",
                strategicImplication: "Review source for details.",
                recommendedAction: "Monitor source.",
                confidence: "100%"
            }));
        }

        setReport(JSON.stringify(fallbackDataObj));
        setDataSource('LIVE');
        setLastSyncTime(currentTime);
        setLastSyncTimestamp(Date.now());
        setNewEmailCount(0);
        setNewestEmailTime(null);
        setIsStale(false);
        eventSource.close();
      } else {
        let finalReportStr = data.report;
        // The LLM often hallucinates placeholders like "[sender name]" for emails due to context limits.
        // We bypass the LLM entirely for the Inbox UI by injecting the raw_emails back into the report!
        if (data.metadata?.raw_emails && data.metadata.raw_emails.length > 0) {
            try {
                let parsedObj = JSON.parse(data.report);
                parsedObj.sourceEmails = data.metadata.raw_emails.map((email: any) => ({
                    from: email.from,
                    subject: email.subject,
                    snippet: email.snippet,
                    category: "Live Sync",
                    priority: "MEDIUM",
                    analysis: "Direct inbox sync.",
                    whyItMatters: "Current inbox context.",
                    recommendedAction: "Review",
                    confidence: "100%"
                }));
                
                if (data.metadata?.raw_executive && data.metadata.raw_executive.length > 0) {
                    parsedObj.executiveIntelligence = data.metadata.raw_executive.map((item: any) => ({
                        name: item.author || item.title || "Executive Intelligence",
                        originalContent: item.text || item.content || "Content unavailable",
                        sourceUrl: item.postUrl || item.url || "#",
                        fetchedAt: item.publishedAt || item.published_date || "Recent",
                        provider: item.provider || "System API",
                        aiSummary: "Raw intelligence retrieved.",
                        strategicImplication: "Review source for details.",
                        recommendedAction: "Monitor source.",
                        confidence: "100%"
                    }));
                }
                
                finalReportStr = JSON.stringify(parsedObj);
            } catch (e) {
                console.error("Failed to inject raw emails into report:", e);
            }
        }
        
        setReport(finalReportStr);
        setDataSource('LIVE');
        setLastSyncTime(currentTime);
        setLastSyncTimestamp(Date.now());
        setEmailCount(data.metadata?.count || 0);
        setNewEmailCount(data.metadata?.new_count || 0);
        
        if (data.metadata?.newest_timestamp && data.metadata.newest_timestamp !== "Unknown") {
            const dt = new Date(data.metadata.newest_timestamp);
            setNewestEmailTime(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        
        setIsStale(false);
      }
      setIsGenerating(false);
    } catch (error) {
      console.warn("Network error during report generation:", error);
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "System", message: "System Error: Network connectivity failed." } }]);
      
      let fallbackDataObj: any = {
        criticalAlerts: [],
        opportunities: [],
        networkingActivity: [],
        strategicInsights: [],
        recommendedActions: [],
        priorityQueue: [
          {
            level: "HIGH",
            category: "Network Error",
            description: "Connection to Backend Failed",
            reason: "The dashboard could not reach the local AI server. Please ensure the backend is running.",
            confidence: "100%"
          }
        ],
        sourceEmails: [],
        executiveIntelligence: []
      };
      
      setReport(JSON.stringify(fallbackDataObj));
      setDataSource('LIVE');
      setLastSyncTime(currentTime);
      setLastSyncTimestamp(Date.now());
      setEmailCount(0);
      setNewEmailCount(0);
      setIsStale(false);
      setIsGenerating(false);
      eventSource.close();
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-4">
            Startup <span className="text-gradient">Ops AI</span>
            {dataSource !== 'PENDING' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider ${
                dataSource === 'LIVE' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${dataSource === 'LIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                {dataSource === 'LIVE' ? 'LIVE GMAIL MODE' : 'DEMO MODE ACTIVE'}
              </div>
            )}
            {isStale && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider bg-red-500/10 border-red-500/30 text-red-400">
                <div className="w-2 h-2 rounded-full animate-pulse bg-red-400"></div>
                STALE DATA
              </div>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
            Autonomous multi-agent operations platform
            {lastSyncTime && (
              <>
                {newestEmailTime && (
                  <>
                    <span className="text-gray-600">&bull;</span>
                    <span className="text-gray-300">Newest Email: <span className="text-white font-medium">{newestEmailTime}</span></span>
                  </>
                )}
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-300">Last Sync: <span className="text-white font-medium">{lastSyncTime}</span></span>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-300">Fetched <span className="text-white font-medium">{emailCount}</span> live emails</span>
                {newEmailCount !== null && newEmailCount > 0 && (
                  <>
                    <span className="text-gray-600">&bull;</span>
                    <span className="text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">New Emails: +{newEmailCount}</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-4">
          {!isAuthenticated ? (
            <button
              onClick={handleLogin}
              disabled={isAuthenticating}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-lg ${
                isAuthenticating 
                  ? "bg-gray-600/50 cursor-not-allowed text-white/70" 
                  : "bg-white text-gray-900 hover:bg-gray-100 shadow-white/10"
              }`}
            >
              {isAuthenticating ? <Activity className="animate-spin" size={18} /> : <Mail size={18} />}
              {isAuthenticating ? "Authenticating..." : "Connect Gmail"}
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsAutonomous(!isAutonomous)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-lg border ${
                  isAutonomous 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isAutonomous ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></div>
                {isAutonomous ? "Autonomous: ACTIVE" : "Autonomous: OFF"}
              </button>
              
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating || isAutonomous}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all shadow-lg ${
                  isGenerating || isAutonomous
                    ? "bg-blue-600/50 cursor-not-allowed text-white/70" 
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                }`}
              >
                {isGenerating || isAutonomous ? <Activity className="animate-spin" size={18} /> : <Play size={18} />}
                {isGenerating ? "System Active..." : isAutonomous ? "Monitoring..." : "Manual Pulse"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { title: "AI Efficiency", value: isGenerating ? "94%" : "100%", icon: <Activity className="text-blue-400" /> },
          { title: "Operational Risk", value: "Low", icon: <BrainCircuit className="text-purple-400" /> },
          { title: "Autonomous Decisions", value: agentUpdates.filter(u => u.type === "agent_update").length, icon: <CheckCircle className="text-emerald-400" /> },
          { title: "Critical Alerts", value: isGenerating ? "2" : "0", icon: <AlertCircle className="text-red-400" /> }
        ].map((metric, i) => (
          <div key={i} className="glass-card p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400 font-medium">{metric.title}</span>
              {metric.icon}
            </div>
            <span className="text-2xl font-bold text-white">{metric.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Agents & Timeline */}
        <div className="lg:col-span-1 space-y-8">
          {/* Active Agents */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">AI Swarm</h2>
            <div className="space-y-4">
              {agents.map(agent => {
                const state = getAgentState(agent.id);
                let stateColor = 'bg-gray-800 text-gray-400';
                let stateLabel = 'Idle';
                let pulseClass = '';

                if (state === 'working') {
                  stateColor = 'bg-blue-500/20 text-blue-400';
                  stateLabel = 'Thinking...';
                  pulseClass = 'animate-pulse';
                } else if (state === 'processing') {
                  stateColor = 'bg-yellow-500/20 text-yellow-400';
                  stateLabel = 'Processing';
                  pulseClass = 'animate-pulse';
                } else if (state === 'success' || state === 'completed') {
                  stateColor = 'bg-emerald-500/20 text-emerald-400';
                  stateLabel = 'Success';
                } else if (state === 'retrying' || state === 'failed') {
                  stateColor = 'bg-red-500/20 text-red-400';
                  stateLabel = state === 'retrying' ? 'Retrying...' : 'Failed';
                  pulseClass = 'animate-bounce';
                }

                return (
                  <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className={`p-2 rounded-lg ${stateColor} ${pulseClass}`}>
                      {agent.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-200">{agent.id}</span>
                        {state !== 'idle' && <span className={`text-[10px] uppercase tracking-wider font-semibold ${stateColor.split(' ')[1]}`}>{stateLabel}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{agent.role}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="glass-card p-6 relative">
            <h2 className="text-lg font-semibold text-white mb-4">Execution Logs</h2>
            <div className="relative timeline-line pl-10 space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {agentUpdates.length === 0 && (
                <div className="text-sm text-gray-500">Awaiting workflow execution...</div>
              )}
              {agentUpdates.map((update, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  key={i} 
                  className="relative"
                >
                  <div className="absolute -left-10 mt-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-[10px] font-mono text-gray-500">[{update.data.timestamp || "00:00:00"}]</span>
                    <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                      {update.type === "crew_start" ? "System" : update.data.agent}
                    </p>
                  </div>
                  <div className="text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                    {update.data.message || "Executing task step..."}
                    {update.data.details && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        {update.data.details}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Report Viewer */}
        <div className="lg:col-span-2">
          <div className="glass-card p-8 h-full min-h-[600px] flex flex-col">
            <h2 className="text-xl font-semibold text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
              <FileText className="text-purple-400" />
              Operations Report
            </h2>
            
            <div className="flex-1 overflow-y-auto w-full no-scrollbar">
              {!report && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <BrainCircuit size={64} className="mb-4" />
                  <p>Click "Generate Daily Report" to initiate the AI swarm.</p>
                </div>
              )}
              {isGenerating && !report && (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"></div>
                    <div className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Agents are analyzing intelligence...</p>
                </div>
              )}
              {report && (() => {
                let data;
                try {
                  const cleaned = report.replace(/```json/g, "").replace(/```/g, "").trim();
                  data = JSON.parse(cleaned);
                } catch (e) {
                  return <div className="text-red-400 p-4 bg-red-900/20 rounded-xl border border-red-500/20 whitespace-pre-wrap">{report}</div>;
                }

                return (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
                    
                    {/* Priority Queue */}
                    {data.priorityQueue && data.priorityQueue.length > 0 && (
                      <section>
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><Target className="text-red-400" size={18} /> Priority Queue</h3>
                        <div className="grid gap-4">
                          {data.priorityQueue.map((item: any, i: number) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} 
                              className={`p-4 rounded-xl border flex gap-4 ${
                                item.level === 'HIGH' ? 'bg-red-500/10 border-red-500/20' : 
                                item.level === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' : 
                                'bg-blue-500/10 border-blue-500/20'
                              }`}>
                              <div className="mt-1">
                                {item.level === 'HIGH' ? <ShieldAlert className="text-red-400" size={24} /> : 
                                 item.level === 'MEDIUM' ? <AlertCircle className="text-amber-400" size={24} /> : 
                                 <Activity className="text-blue-400" size={24} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    item.level === 'HIGH' ? 'bg-red-500/20 text-red-300' : 
                                    item.level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' : 
                                    'bg-blue-500/20 text-blue-300'
                                  }`}>{item.level}</span>
                                  <span className="text-sm font-medium text-gray-300">{item.category}</span>
                                  {item.confidence && <span className="ml-auto text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20"><Target size={10}/> {item.confidence}</span>}
                                </div>
                                <p className="text-white font-medium mb-1">{item.description}</p>
                                <p className="text-sm text-gray-400">{item.reason}</p>
                                <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-1 font-medium bg-white/5 inline-flex px-2 py-1 rounded-md border border-white/5 hover:bg-white/10 transition-colors">
                                  <ChevronRight size={12} className="text-blue-500" /> Generated from source email
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Opportunities & Networking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.opportunities && data.opportunities.length > 0 && (
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><Briefcase className="text-emerald-400" size={18} /> Opportunities</h3>
                          <div className="space-y-3">
                            {data.opportunities.map((item: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
                                <p className="text-gray-400 text-xs mb-2">{item.description}</p>
                                {item.source && <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-1 rounded-md">{item.source}</span>}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {data.networkingActivity && data.networkingActivity.length > 0 && (
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><Users className="text-purple-400" size={18} /> Networking</h3>
                          <div className="space-y-3">
                            {data.networkingActivity.map((item: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
                                <p className="text-gray-400 text-xs">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>

                    {/* Strategic Insights & Recommended Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.strategicInsights && data.strategicInsights.length > 0 && (
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><Lightbulb className="text-yellow-400" size={18} /> Strategic Insights</h3>
                          <ul className="space-y-2">
                            {data.strategicInsights.map((insight: any, i: number) => (
                              <motion.li whileHover={{ scale: 1.02 }} key={i} className="flex gap-3 text-sm text-gray-300 bg-yellow-500/5 p-3 rounded-lg border border-yellow-500/10 transition-all">
                                <TrendingUp size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                                <div className="flex justify-between items-start w-full">
                                  <span>{insight.insight || insight}</span>
                                  {insight.confidence && <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full ml-2 shrink-0 border border-yellow-500/20">{insight.confidence}</span>}
                                </div>
                              </motion.li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {data.recommendedActions && data.recommendedActions.length > 0 && (
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2"><Navigation className="text-blue-400" size={18} /> Action Items</h3>
                          <ul className="space-y-2">
                            {data.recommendedActions.map((action: any, i: number) => (
                              <motion.li whileHover={{ scale: 1.02 }} key={i} className="flex gap-3 text-sm text-gray-300 bg-blue-500/5 p-3 rounded-lg border border-blue-500/10 transition-all">
                                <Zap size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                <div className="flex justify-between items-start w-full">
                                  <span>{action.action || action}</span>
                                  {action.confidence && <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full ml-2 shrink-0 border border-blue-500/20">{action.confidence}</span>}
                                </div>
                              </motion.li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Far Right Column: Inbox Intelligence */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 h-full min-h-[600px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-4 flex items-center gap-2">
              <Inbox className="text-blue-400" size={20} />
              Recent Inbox
            </h2>
            <div className="flex-1 overflow-y-auto w-full no-scrollbar space-y-4">
              {(!report || isGenerating) && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                   <Clock size={32} className="mb-2" />
                   <p className="text-sm text-center">Awaiting intelligence data...</p>
                </div>
              )}
              {report && (() => {
                let data;
                try {
                  const cleaned = report.replace(/```json/g, "").replace(/```/g, "").trim();
                  data = JSON.parse(cleaned);
                } catch (e) {
                  return null;
                }
                if (!data.sourceEmails || data.sourceEmails.length === 0) return <div className="text-sm text-gray-500 text-center mt-10">No source emails available.</div>;
                
                return data.sourceEmails.map((email: any, i: number) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i}
                    onClick={() => setSelectedEmail(email)}
                    className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-gray-300 truncate max-w-[150px]">{email.from}</span>
                      <span className="text-[10px] text-gray-500">{email.timestamp}</span>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">{email.subject}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{email.snippet}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{email.category}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        email.priority === 'HIGH' ? 'bg-red-500' :
                        email.priority === 'MEDIUM' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Executive Intelligence Feed */}
      {report && (() => {
        let data;
        try {
          const cleaned = report.replace(/```json/g, "").replace(/```/g, "").trim();
          data = JSON.parse(cleaned);
        } catch (e) {
          return null;
        }
        
        if (data.executiveIntelligence && data.executiveIntelligence.length > 0) {
          return (
            <div className="mt-8 glass-card p-8">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                  <Globe className="text-emerald-400" />
                  Executive Intelligence Feed
                </h2>
                <div className="flex gap-4">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-300">
                      <div className={`w-2 h-2 rounded-full ${dataSource === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
                      Source: Tavily API
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-300">
                      <div className={`w-2 h-2 rounded-full ${dataSource === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
                      Source: Apify LinkedIn Monitor
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.executiveIntelligence.map((intel: any, i: number) => {
                  const isVerified = intel.sourceUrl && intel.originalContent && intel.provider;
                  
                  return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white/5 border border-white/10 rounded-xl p-0 relative overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className={`p-4 border-b flex justify-between items-center ${isVerified ? 'border-white/10 bg-black/20' : 'border-red-500/20 bg-red-500/10'}`}>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {intel.name}
                        {!isVerified && <span className="text-[10px] uppercase font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={12}/> Unverified Intelligence</span>}
                      </h3>
                      {intel.confidence && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Target size={10}/> {intel.confidence} Confident</span>}
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                      {/* REAL SOURCE ZONE */}
                      <div className="relative">
                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-blue-500/50 rounded-full"></div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Globe size={12}/> Real Source Data
                        </h4>
                        
                        <div className="space-y-3 pl-3">
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {intel.provider && <span className="bg-white/10 text-gray-300 px-2 py-1 rounded border border-white/5 font-medium">{intel.provider}</span>}
                            {intel.fetchedAt && <span className="bg-white/10 text-gray-400 px-2 py-1 rounded border border-white/5 flex items-center gap-1"><Clock size={10}/> {intel.fetchedAt}</span>}
                            {intel.sourceUrl && <a href={intel.sourceUrl} target="_blank" rel="noreferrer" className="bg-blue-500/10 text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-500/20 transition-colors truncate max-w-[200px]">Source Link</a>}
                          </div>
                          
                          <div className="bg-black/40 border border-white/5 rounded-lg p-4">
                            <p className="text-sm text-gray-300 italic font-serif">&quot;{intel.originalContent || "No original content provided."}&quot;</p>
                          </div>
                        </div>
                      </div>

                      {/* AI ANALYSIS ZONE */}
                      <div className="relative">
                         <div className="absolute -left-2 top-0 bottom-0 w-1 bg-purple-500/50 rounded-full"></div>
                         <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <BrainCircuit size={12}/> AI Analysis
                         </h4>
                         
                         <div className="space-y-4 pl-3">
                            <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Summary</span>
                              <p className="text-sm text-gray-200">{intel.aiSummary}</p>
                            </div>
                            
                            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
                              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">Strategic Implication</span>
                              <p className="text-sm text-gray-300">{intel.strategicImplication}</p>
                            </div>
                            
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Zap size={12}/> Recommended Action</span>
                              <p className="text-sm text-gray-300 font-medium">{intel.recommendedAction}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )})}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-2xl glass-card border border-white/20 p-0 overflow-hidden shadow-2xl relative">
            
            {/* Header */}
            <div className={`p-6 border-b ${
              selectedEmail.priority === 'HIGH' ? 'bg-red-500/10 border-red-500/20' :
              selectedEmail.priority === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' :
              'bg-blue-500/10 border-blue-500/20'
            }`}>
              <button onClick={() => setSelectedEmail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedEmail.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                  selectedEmail.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>{selectedEmail.priority} PRIORITY</span>
                <span className="text-xs font-medium text-gray-400">{selectedEmail.category}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300 font-medium">{selectedEmail.from}</span>
                <span className="text-gray-500">&bull;</span>
                <span className="text-gray-500">{selectedEmail.timestamp}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 bg-black/40">
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Original Content</h4>
                <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-lg border border-white/5">
                  {selectedEmail.snippet}
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5"><BrainCircuit size={14} /> Executive AI Analysis</h4>
                    {selectedEmail.confidence && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Target size={10}/> {selectedEmail.confidence} Confident</span>}
                  </div>
                  <p className="text-sm text-gray-200 relative z-10 font-medium">{selectedEmail.analysis}</p>
                  
                  {selectedEmail.whyItMatters && (
                    <div className="mt-2 pt-2 border-t border-purple-500/10 relative z-10">
                      <span className="text-[10px] font-bold text-purple-400/70 uppercase tracking-wider block mb-1">Strategic Implication</span>
                      <p className="text-xs text-gray-400">{selectedEmail.whyItMatters}</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 relative z-10"><Zap size={14} /> Recommended Action</h4>
                  <p className="text-sm text-gray-200 font-medium relative z-10">{selectedEmail.recommendedAction}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
