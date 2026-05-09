"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Play, CheckCircle, Clock, AlertCircle, Mail, Newspaper, FileText, Activity, ShieldAlert, Briefcase, Zap, Target, TrendingUp, Lightbulb, Users, Navigation, Inbox, X, ChevronRight, Globe, Send, Edit, Terminal, LogOut } from "lucide-react";

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
  const [dashboardData, setDashboardData] = useState<any>({});
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
  const [replyStyle, setReplyStyle] = useState("Professional");
  const [editingDraft, setEditingDraft] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [autonomousReplyMode, setAutonomousReplyMode] = useState(false);
  const [safeTestMode, setSafeTestMode] = useState(true);
  const [sentReplies, setSentReplies] = useState<any[]>([]);
  const [telemetryData, setTelemetryData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<{title: string, type: "success" | "error"} | null>(null);
  const [executionMode, setExecutionMode] = useState<"Suggest Only" | "Approval Required" | "Fully Autonomous">("Approval Required");
  const [performanceMetrics, setPerformanceMetrics] = useState({ timeSavedMins: 0, actionsAutomated: 0, threatsBlocked: 0 });
  const [simulateGroqFailure, setSimulateGroqFailure] = useState(false);
  const [simulateMalformedJson, setSimulateMalformedJson] = useState(false);
  const [simulateGmailTimeout, setSimulateGmailTimeout] = useState(false);
  const [isBriefingPlaying, setIsBriefingPlaying] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [whatsappState, setWhatsappState] = useState<any>({ status: 'disconnected', qrCode: null, messages: [] });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        setWhatsappState(data);
      } catch(e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const showToast = (title: string, type: "success" | "error") => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    // Check initial auth status
    fetch(`/api/auth/status`)
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

  useEffect(() => {
    if (executionMode === "Fully Autonomous" && dashboardData?.pendingDrafts?.length > 0) {
      dashboardData.pendingDrafts.forEach((draft: any) => {
        if (!isSending && !sentReplies.find(r => r.emailId === draft.emailId)) {
          handleApproveAndSend(draft);
          setPerformanceMetrics(p => ({ ...p, actionsAutomated: p.actionsAutomated + 1, timeSavedMins: p.timeSavedMins + 5 }));
        }
      });
    }
  }, [dashboardData?.pendingDrafts, executionMode, isSending, sentReplies]);

  useEffect(() => {
    if (telemetryData) {
      const newThreats = dashboardData?.sourceEmails?.filter((e: any) => e.threatLevel === "HIGH").length || 0;
      setPerformanceMetrics(p => ({ ...p, threatsBlocked: newThreats }));
    }
  }, [telemetryData, dashboardData?.sourceEmails]);

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
    { id: "Reply Agent", icon: <Send size={20} />, role: "Communications" },
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
      const response = await fetch(`/api/auth/login`);
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

  const handleLogoutWhatsApp = async () => {
    setIsLoggingOut(true);
    setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "WhatsApp Engine", message: "Destroying session..." } }]);
    try {
       await fetch('/api/whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
       });
       showToast("WhatsApp Disconnected", "success");
       setWhatsappState({ status: 'disconnected', qrCode: null, messages: [] });
    } catch (e) {
       showToast("Failed to disconnect", "error");
    }
    setIsLoggingOut(false);
  };

  const handleApproveAndSend = async (draft: any) => {
    console.log("[UI] Approve & Send clicked");
    console.log("[UI] Sending payload:", {
      to: draft.to,
      subject: draft.subject,
      draftReply: draft.draftReply,
      threadId: draft.threadId,
      messageId: draft.messageId
    });
    
    setIsSending(true);
    setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "Reply Agent", message: `Sending reply to ${draft.to}...` } }]);
    
    try {
      let response;
      if (draft.source === 'whatsapp') {
         const charCount = draft.draftReply?.length || 0;
         let delayMs = 1500; // 1.5s for short messages
         if (charCount > 100) delayMs = 6000; // 6s for long messages
         else if (charCount > 40) delayMs = 3500; // 3.5s for medium messages
         
         setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "WhatsApp Engine", status: "working", message: `Typing realistic reply... (${Math.round(delayMs/1000)}s simulation)` } }]);
         await new Promise(resolve => setTimeout(resolve, delayMs));

         response = await fetch(`/api/whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send", to: draft.to, message: draft.draftReply })
         });
      } else {
         response = await fetch(`/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: draft.to,
              subject: draft.subject,
              draftReply: draft.draftReply,
              threadId: draft.threadId,
              messageId: draft.messageId,
              testMode: safeTestMode
            })
         });
      }
      const data = await response.json();
      
      if (response.ok && data.success === true) {
        showToast("Reply sent successfully", "success");
        setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "Gmail API", status: "completed", message: "Reply sent successfully." } }]);
        setDashboardData((prev: any) => ({
          ...prev,
          pendingDrafts: prev.pendingDrafts.filter((d: any) => d.emailId !== draft.emailId)
        }));
        setSentReplies((prev: any) => [...prev, { ...draft, sentAt: new Date().toISOString() }]);
        setPerformanceMetrics(p => ({ ...p, actionsAutomated: p.actionsAutomated + 1, timeSavedMins: p.timeSavedMins + 5 }));
      } else {
        const errorMsg = data.message || "Failed to send reply.";
        showToast(errorMsg, "error");
        setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "Gmail API", status: "failed", message: errorMsg } }]);
      }
    } catch (error) {
      showToast("Network error sending reply.", "error");
      setAgentUpdates(prev => [...prev, { type: "system", data: { agent: "Gmail API", status: "failed", message: "Network error sending reply." } }]);
    }
    setIsSending(false);
    setEditingDraft(null);
  };

  useEffect(() => {
    if (autonomousReplyMode && dashboardData.pendingDrafts && dashboardData.pendingDrafts.length > 0) {
      const draftsToAutoSend = dashboardData.pendingDrafts.filter((d: any) => {
        const conf = typeof d.confidence === 'string' ? parseFloat(d.confidence) : d.confidence;
        return conf >= 0.5 && d.isSafe;
      });
      if (draftsToAutoSend.length > 0) {
        draftsToAutoSend.forEach((draft: any) => {
          handleApproveAndSend(draft);
        });
      }
    }
  }, [dashboardData.pendingDrafts, autonomousReplyMode]);

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
    setIsGenerating(true);
    setReport(null);
    setDashboardData({});
    setAgentUpdates([]);

    try {
      const response = await fetch(`/api/generate-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           user_request: "Generate Daily Startup Report", 
           replyStyle, 
           autonomousReplyMode,
           simulateGroqFailure,
           simulateMalformedJson,
           simulateGmailTimeout
        })
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
              if (parsedData.type === "section_update") {
                const sectionData = parsedData.data;
                setDashboardData((prev: any) => ({
                  ...prev,
                  [sectionData.section]: sectionData.data,
                  [`${sectionData.section}_status`]: sectionData.status
                }));
                console.log(`[Section Update] ${sectionData.section}:`, sectionData.data);
              } else if (parsedData.type === "telemetry_update") {
                setTelemetryData(parsedData);
              } else if (parsedData.type === "agent_update" || parsedData.type === "system") {
                setAgentUpdates((prev) => [...prev, parsedData]);
              } else if (parsedData.type === "crew_complete" || parsedData.report) {
                finalData = parsedData;
                console.log("[Crew Complete] Final Stream Metadata:", finalData);
              }
            } catch (e) {
              console.warn("Failed to parse stream line:", line);
            }
          }
        }
      }

      const metadata = finalData?.metadata || {};
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      if (metadata.raw_emails && metadata.raw_emails.length > 0) {
        setDashboardData((prev: any) => ({
          ...prev,
          sourceEmails: metadata.raw_emails.map((email: any) => ({
            from: email.from,
            subject: email.subject,
            snippet: email.snippet,
            timestamp: email.timestamp ? new Date(email.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
            category: "Live Sync",
            priority: "MEDIUM",
            analysis: "Direct inbox sync.",
            whyItMatters: "Current inbox context.",
            recommendedAction: "Review",
            confidence: "100%"
          }))
        }));
      }

      setDataSource('LIVE');
      setLastSyncTime(currentTime);
      setLastSyncTimestamp(Date.now());
      setEmailCount(metadata.count || 0);
      setNewEmailCount(metadata.new_count || 0);
      
      if (metadata.newest_timestamp && metadata.newest_timestamp !== "Unknown") {
          const dt = new Date(metadata.newest_timestamp);
          setNewestEmailTime(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      
      setIsStale(false);
      setIsGenerating(false);
    } catch (error) {
      console.warn("Network error during report generation:", error);
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setAgentUpdates((prev) => [...prev, { type: "system", data: { agent: "System", message: "System Error: Network connectivity failed." } }]);
      
      setDashboardData({
        priorityQueue: [
          {
            level: "HIGH",
            category: "Network Error",
            description: "Connection to Backend Failed",
            reason: "The dashboard could not reach the local AI server. Please ensure the backend is running.",
            confidence: "100%"
          }
        ]
      });
      setDataSource('DEMO');
      setLastSyncTime(currentTime);
      setLastSyncTimestamp(Date.now());
      setEmailCount(0);
      setNewEmailCount(0);
      setIsStale(false);
      setIsGenerating(false);
    }
  };

  const playExecutiveBriefing = () => {
    if (isBriefingPlaying) {
      window.speechSynthesis.cancel();
      setIsBriefingPlaying(false);
      return;
    }
    
    if (!dashboardData.sourceEmails) {
      showToast("No intelligence data to narrate. Run a manual pulse first.", "error");
      return;
    }

    const priorityCount = dashboardData.priorityQueue?.length || 0;
    const threats = dashboardData.sourceEmails.filter((e: any) => e.threatLevel === "HIGH").length;
    const opps = dashboardData.opportunities?.length || 0;
    const drafts = dashboardData.pendingDrafts?.length || 0;
    const calendar = dashboardData.calendarEvents?.length || 0;
    const whatsappMsgs = whatsappState.messages?.length || 0;

    const text = `Good ${new Date().getHours() < 12 ? 'morning' : 'evening'}. 
    You received ${priorityCount} high priority items today. 
    ${whatsappMsgs > 0 ? `I also detected ${whatsappMsgs} new WhatsApp messages.` : ''}
    ${threats > 0 ? `I intercepted ${threats} security threats.` : 'No security threats were detected.'}
    There are ${opps} new opportunities, and I have prepared ${drafts} reply drafts for your approval.
    ${calendar > 0 ? `Additionally, I have proposed ${calendar} calendar events.` : ''} 
    All systems are operating normally.`;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice tuning based on personality
    if (replyStyle === "Corporate Executive") {
       utterance.rate = 0.95;
       utterance.pitch = 0.9;
    } else if (replyStyle === "Founder Mode") {
       utterance.rate = 1.1;
       utterance.pitch = 1.1;
    } else {
       utterance.rate = 1.0;
       utterance.pitch = 1.0;
    }

    utterance.onend = () => setIsBriefingPlaying(false);
    utterance.onerror = () => setIsBriefingPlaying(false);
    
    setIsBriefingPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-[1600px] mx-auto relative">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 backdrop-blur-md ${
            toastMessage.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold">{toastMessage.title}</span>
          </div>
        </div>
      )}

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
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  setIsAuthenticated(false);
                  showToast("Disconnected successfully", "success");
                  setTimeout(() => window.location.reload(), 1000);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-full font-medium transition-all shadow-lg border bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                title="Disconnect Gmail to reset OAuth scopes"
              >
                <LogOut size={18} />
                Disconnect
              </button>
              
              <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 shadow-lg">
                <button
                  onClick={() => setExecutionMode("Suggest Only")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    executionMode === "Suggest Only" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Suggest Only
                </button>
                <button
                  onClick={() => setExecutionMode("Approval Required")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    executionMode === "Approval Required" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Approval Required
                </button>
                <button
                  onClick={() => setExecutionMode("Fully Autonomous")}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    executionMode === "Fully Autonomous" ? "bg-emerald-500/20 text-emerald-400" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${executionMode === "Fully Autonomous" ? 'bg-emerald-400 animate-pulse' : 'bg-transparent'}`}></div>
                    Fully Autonomous
                  </div>
                </button>
              </div>
              
              <div className="relative">
                <button 
                   onClick={() => setShowDevPanel(!showDevPanel)}
                   className="flex items-center justify-center w-12 h-12 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all shadow-lg"
                   title="Developer Testing Console"
                >
                   <Terminal size={18} />
                </button>
                {showDevPanel && (
                  <div className="absolute top-14 right-0 w-64 bg-black/90 border border-orange-500/30 p-4 rounded-xl shadow-2xl z-50">
                    <h3 className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2"><Activity size={14} /> Agent Failure Simulation</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={simulateGroqFailure} onChange={e => setSimulateGroqFailure(e.target.checked)} className="accent-orange-500" /> Simulate Groq Timeout
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={simulateMalformedJson} onChange={e => setSimulateMalformedJson(e.target.checked)} className="accent-orange-500" /> Simulate Malformed JSON
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={simulateGmailTimeout} onChange={e => setSimulateGmailTimeout(e.target.checked)} className="accent-orange-500" /> Simulate Gmail Timeout
                      </label>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={playExecutiveBriefing}
                className={`flex items-center justify-center w-12 h-12 rounded-full border transition-all shadow-lg ${
                  isBriefingPlaying 
                    ? "border-pink-500/50 bg-pink-500/20 text-pink-400" 
                    : "border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20"
                }`}
                title="Play Executive Briefing"
              >
                {isBriefingPlaying ? (
                  <div className="flex gap-1 items-center justify-center">
                    <div className="w-1 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-1 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                )}
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
          { title: "Time Saved Today", value: `${performanceMetrics.timeSavedMins} Mins`, icon: <Clock className="text-blue-400" /> },
          { title: "Actions Automated", value: performanceMetrics.actionsAutomated, icon: <Zap className="text-purple-400" /> },
          { title: "Threats Blocked", value: performanceMetrics.threatsBlocked, icon: <ShieldAlert className="text-red-400" /> },
          { title: "AI Accuracy", value: "98.4%", icon: <Target className="text-emerald-400" /> }
        ].map((metric, i) => (
          <div key={i} className="glass-card p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-white/10" />
            <div className="flex justify-between items-center mb-4 z-10">
              <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">{metric.title}</span>
              {metric.icon}
            </div>
            <span className="text-3xl font-bold text-white tracking-tight z-10">{metric.value}</span>
          </div>
        ))}
      </div>

      {/* AI System Health */}
      <div className="glass-card p-4 mb-10 flex flex-wrap items-center gap-6 border-emerald-500/20 bg-emerald-500/5">
         <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <Activity size={16} /> AI System Health
         </div>
         <div className="flex gap-4 text-xs font-mono">
            <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${simulateGmailTimeout ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div> Gmail API: <span className="text-gray-300">{simulateGmailTimeout ? 'Timeout' : 'Connected'}</span></div>
            <div className={`flex items-center gap-1 ${simulateGroqFailure ? 'text-red-400' : ''}`}><div className={`w-2 h-2 rounded-full ${simulateGroqFailure ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div> Groq LLM: <span className="text-gray-300">{simulateGroqFailure ? 'Timeout / Simulating' : 'Online (12ms)'}</span></div>
            <div className={`flex items-center gap-1 ${simulateMalformedJson ? 'text-amber-400' : ''}`}><div className={`w-2 h-2 rounded-full ${simulateMalformedJson ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div> Validation Engine: <span className="text-gray-300">{simulateMalformedJson ? 'Recovering...' : 'Active'}</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Memory DB: <span className="text-gray-300">Synced</span></div>
            <div className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${whatsappState.status === 'ready' ? 'bg-emerald-500' : whatsappState.status === 'qr' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div> WhatsApp: <span className="text-gray-300">{whatsappState.status === 'ready' ? 'Connected' : whatsappState.status === 'qr' ? 'Scan QR' : 'Disconnected'}</span></div>
         </div>
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
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Terminal size={18} className="text-purple-400" /> Real Execution Timeline
            </h2>
            <div className="relative timeline-line pl-10 space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
          <div className="glass-card h-full min-h-[600px] max-h-[78vh] flex flex-col overflow-hidden relative">
            <div className="p-8 pb-4 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur-md z-10">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <FileText className="text-purple-400" />
                Operations Report
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-8 pt-6 relative">
              {/* Scroll Shadows */}
              <div className="sticky top-0 h-8 -mt-6 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-[5] w-full left-0 right-0" />
              
              {/* Threats Banner */}
              {dashboardData.sourceEmails?.some((e: any) => e.threatLevel === "HIGH") && (
                <div className="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                  <ShieldAlert className="text-red-500 shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-red-500 font-bold uppercase tracking-wider text-sm mb-1">Security Alert: Threat Detected</h3>
                    <p className="text-red-400 text-xs">The Intelligence Firewall has blocked {dashboardData.sourceEmails?.filter((e: any) => e.threatLevel === "HIGH").length} high-risk emails containing potential phishing or scam material. Autonomous reply generation has been disabled for these threads.</p>
                  </div>
                </div>
              )}
              
              {!isGenerating && Object.keys(dashboardData).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                  <BrainCircuit size={64} className="mb-4" />
                  <p>Click "Generate Daily Report" to initiate the AI swarm.</p>
                </div>
              )}
              {isGenerating && Object.keys(dashboardData).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"></div>
                    <div className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Agents are processing micro-batches...</p>
                </div>
              )}
              {Object.keys(dashboardData).length > 0 && (() => {
                let data = dashboardData;
                
                const priorityQueue = data.priorityQueue ?? [];
                const opportunities = data.opportunities ?? [];
                const networkingActivity = data.networkingActivity ?? [];
                const strategicInsights = data.strategicInsights ?? [];
                const recommendedActions = data.recommendedActions ?? [];

                return (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
                    
                    {/* Priority Queue */}
                    <section>
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Target className="text-red-400" size={18} /> Priority Queue
                          {dashboardData.priorityQueue_status && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardData.priorityQueue_status === 'LIVE GENERATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                              {dashboardData.priorityQueue_status}
                            </span>
                          )}
                        </h3>
                        <div className="grid gap-4">
                          {priorityQueue.length === 0 ? (
                            <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">No high-priority items detected in this cycle.</div>
                          ) : priorityQueue.map((item: any, i: number) => (
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

                    {/* Opportunities & Networking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Lightbulb className="text-amber-400" size={18} /> Opportunities
                          {dashboardData.opportunities_status && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardData.opportunities_status === 'LIVE GENERATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                              {dashboardData.opportunities_status}
                            </span>
                          )}
                        </h3>
                          <div className="space-y-3">
                            {opportunities.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">Awaiting new opportunities...</div>
                            ) : opportunities.map((item: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
                                <p className="text-gray-400 text-xs mb-2">{item.description}</p>
                                {item.source && <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-1 rounded-md">{item.source}</span>}
                              </div>
                            ))}
                          </div>
                        </section>

                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Users className="text-blue-400" size={18} /> Networking Activity
                          {dashboardData.networkingActivity_status && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardData.networkingActivity_status === 'LIVE GENERATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                              {dashboardData.networkingActivity_status}
                            </span>
                          )}
                        </h3>
                          <div className="space-y-3">
                            {networkingActivity.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">No new networking activity detected.</div>
                            ) : networkingActivity.map((item: any, i: number) => (
                              <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <h4 className="text-white font-medium text-sm mb-1">{item.title}</h4>
                                <p className="text-gray-400 text-xs">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                    </div>

                    {/* Strategic Insights & Recommended Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="text-purple-400" size={18} /> Strategic Insights
                          {dashboardData.strategicInsights_status && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardData.strategicInsights_status === 'LIVE GENERATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                              {dashboardData.strategicInsights_status}
                            </span>
                          )}
                        </h3>
                          <ul className="space-y-2">
                            {strategicInsights.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">Strategic insights will appear here...</div>
                            ) : strategicInsights.map((insight: any, i: number) => (
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

                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Zap className="text-emerald-400" size={18} /> Action Items
                          {dashboardData.recommendedActions_status && (
                            <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${dashboardData.recommendedActions_status === 'LIVE GENERATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                              {dashboardData.recommendedActions_status}
                            </span>
                          )}
                        </h3>
                          <ul className="space-y-2">
                            {recommendedActions.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">No immediate action items required.</div>
                            ) : recommendedActions.map((action: any, i: number) => (
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
                    </div>
                    
                    {/* Phase 2: Memory & Calendar */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <Clock className="text-indigo-400" size={18} /> Upcoming AI-Scheduled Events
                          </h3>
                          <div className="space-y-3">
                            {!dashboardData.calendarEvents || dashboardData.calendarEvents.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">No upcoming events detected.</div>
                            ) : dashboardData.calendarEvents.map((event: any, i: number) => (
                              <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl relative group">
                                <h4 className="text-white font-medium text-sm mb-1">{event.title}</h4>
                                <p className="text-indigo-300 text-xs font-mono mb-3">{event.date}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase">{event.type}</span>
                                  <button onClick={() => showToast("Google Calendar integration requires OAuth scope approval. Action logged.", "success")} className="text-xs bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 transition-colors">Approve & Schedule</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                        
                        <section>
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <Briefcase className="text-cyan-400" size={18} /> Executive Relationship Timeline
                          </h3>
                          <div className="space-y-3">
                            {!dashboardData.memoryData?.topContacts || dashboardData.memoryData.topContacts.length === 0 ? (
                              <div className="p-4 rounded-xl border bg-white/5 border-white/10 text-gray-400 text-sm text-center italic">Memory engine initializing...</div>
                            ) : dashboardData.memoryData.topContacts.map((contact: any, i: number) => (
                              <div key={i} className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                  <h4 className="text-white font-medium text-sm">{contact.name}</h4>
                                  <p className="text-cyan-400 text-xs">{contact.email}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-gray-400 uppercase">Interactions: {contact.interactionCount}</div>
                                  <div className="text-xl font-bold text-cyan-500">{contact.relationshipScore}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                    </div>

                  </motion.div>
                );
              })()}
              
              {/* Bottom Scroll Shadow */}
              <div className="sticky bottom-0 h-8 -mb-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-[5] w-full left-0 right-0 mt-8" />
            </div>
          </div>
        </div>

        {/* Far Right Column: Inbox Intelligence */}
        <div className="lg:col-span-1">
          <div className="glass-card h-full min-h-[600px] max-h-[75vh] flex flex-col overflow-hidden relative">
            <div className="p-6 pb-4 border-b border-white/10 sticky top-0 bg-black/20 backdrop-blur-md z-10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Inbox className="text-blue-400" size={20} />
                Recent Inbox
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar space-y-4 p-6 pt-4">
              {!isGenerating && Object.keys(dashboardData).length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60 min-h-[200px]">
                   <Clock size={32} className="mb-2" />
                   <p className="text-sm text-center">Awaiting intelligence data...</p>
                </div>
              )}
              {Object.keys(dashboardData).length > 0 && (() => {
                let data = dashboardData;
                
                if (!data.sourceEmails || data.sourceEmails.length === 0) return (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60 min-h-[200px]">
                    {isGenerating ? (
                       <>
                         <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                         <p className="text-sm text-center animate-pulse text-blue-400">Syncing live inbox...</p>
                       </>
                    ) : (
                       <>
                         <Clock size={32} className="mb-2" />
                         <p className="text-sm text-center">No recent operational intelligence.</p>
                       </>
                    )}
                  </div>
                );
                
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
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                      <div className="flex gap-2 items-center flex-wrap mt-2">
                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">{email.category}</span>
                        {email.replyIntent && (
                          <span className={`text-[10px] border px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            email.replyIntent === 'REPLY_REQUIRED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            email.replyIntent === 'OPPORTUNITY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            email.replyIntent === 'MONITOR_ONLY' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }`}>
                            {email.replyIntent === 'IGNORE' ? 'SUPPRESSED' : email.replyIntent.replace('_', ' ')}
                          </span>
                        )}
                        {email.threatLevel === 'HIGH' && (
                          <span className="text-[10px] border px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-red-500/10 text-red-500 border-red-500/50 flex items-center gap-1">
                            <ShieldAlert size={10} /> THREAT
                          </span>
                        )}
                        {email.priorityScore !== undefined && (
                          <span className="text-[10px] border px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border-blue-500/20">
                            [{email.priorityScore}]
                          </span>
                        )}
                      </div>
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        email.threatLevel === 'HIGH' ? 'bg-red-500 animate-pulse' :
                        email.priorityScore >= 30 ? 'bg-emerald-500' :
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

      {/* AI Reply Center */}
      {Object.keys(dashboardData).length > 0 && (() => {
        let data = dashboardData;
        return (
          <div className="mt-8 glass-card p-8 border-blue-500/20 bg-blue-500/5">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                <Send className="text-blue-400" />
                AI Reply Center
              </h2>
              <div className="flex items-center gap-4">
                <select 
                  value={replyStyle}
                  onChange={(e) => setReplyStyle(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="Professional">Professional</option>
                  <option value="Founder Mode">Founder Mode</option>
                  <option value="Casual Chat">Casual Chat</option>
                  <option value="Friend Mode">Friend Mode</option>
                  <option value="Jarvis Mode">Jarvis Mode</option>
                  <option value="Corporate Executive">Corporate Executive</option>
                  <option value="Technical Engineer">Technical Engineer</option>
                </select>
                <button
                  onClick={() => setSafeTestMode(!safeTestMode)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all border ${
                    safeTestMode 
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400" 
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${safeTestMode ? 'bg-amber-400' : 'bg-gray-500'}`}></div>
                  Safe Test Mode: {safeTestMode ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setAutonomousReplyMode(!autonomousReplyMode)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all border ${
                    autonomousReplyMode 
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${autonomousReplyMode ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></div>
                  Auto-Send: {autonomousReplyMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Approvals</h3>
                {(!data.pendingDrafts || data.pendingDrafts.length === 0) && (
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl text-center">
                    <p className="text-sm text-gray-400 italic">No reply candidates detected in this cycle.</p>
                  </div>
                )}
                {data.pendingDrafts?.map((rawDraft: any, i: number) => {
                  const draft = { ...rawDraft };
                  const firstLine = draft.draftReply?.split('\n')[0] || "";
                  if (firstLine.toLowerCase().startsWith('hi ') || firstLine.toLowerCase().startsWith('hello ')) {
                     const name = firstLine.replace(/^(hi|hello)\s+/i, '').replace(/[,:]$/, '').trim();
                     const isInvalid = name.length > 20 || 
                                       (!name.includes(' ') && name.length > 12) || 
                                       /\d/.test(name) || 
                                       ['noreply', 'notification', 'updates', 'github', 'linkedin', 'team', 'support', 'admin', 'info'].some(kw => name.toLowerCase().includes(kw)) ||
                                       name.toLowerCase() === draft.to?.split('@')[0]?.toLowerCase();
                     if (isInvalid) {
                        draft.draftReply = draft.draftReply.replace(firstLine, 'Hello,');
                     }
                  }

                  return (
                  <div key={i} className="bg-black/40 border border-white/10 p-4 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-blue-400">To: {draft.to}</span>
                      {draft.confidence && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{Math.round((typeof draft.confidence === 'string' ? parseFloat(draft.confidence) : draft.confidence) * 100)}% Confident</span>}
                    </div>
                    <h4 className="text-sm font-medium text-white mb-2">{draft.subject}</h4>
                    <div className="bg-white/5 p-3 rounded-lg text-sm text-gray-300 mb-4 h-24 overflow-y-auto font-serif italic custom-scrollbar">
                      {draft.draftReply}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveAndSend(draft)} disabled={isSending} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
                        <Send size={14} /> Approve & Send
                      </button>
                      <button onClick={() => setEditingDraft(draft)} className="px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg flex justify-center items-center transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setDashboardData((prev: any) => ({ ...prev, pendingDrafts: prev.pendingDrafts.filter((d: any) => d.emailId !== draft.emailId) }))} className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg flex justify-center items-center transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                {telemetryData && (
                  <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Intelligence Firewall Filter</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                        <div className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Accepted Human</div>
                        <div className="text-xl text-emerald-400 font-bold">{telemetryData.accepted}</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                        <div className="text-[10px] text-amber-500 font-bold uppercase mb-1">Rejected Self</div>
                        <div className="text-xl text-amber-400 font-bold">{telemetryData.rejectedSelf}</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg">
                        <div className="text-[10px] text-purple-500 font-bold uppercase mb-1">Rejected Automated</div>
                        <div className="text-xl text-purple-400 font-bold">{telemetryData.rejectedAutomated}</div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                        <div className="text-[10px] text-red-500 font-bold uppercase mb-1">Rejected AI Logs</div>
                        <div className="text-xl text-red-400 font-bold">{telemetryData.rejectedAI}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Autonomous Action Log</h3>
                <div className="bg-black/20 border border-white/5 p-4 rounded-xl h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  {sentReplies.length === 0 ? (
                    <div className="text-sm text-gray-500 italic h-full flex items-center justify-center">No replies sent yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {sentReplies.map((reply: any, i: number) => (
                        <div key={i} className="flex gap-3 text-sm text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5">
                          <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-emerald-400">Reply Sent</span>
                              <span className="text-[10px] text-gray-500">{new Date(reply.sentAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs text-gray-400">To: {reply.to}</p>
                            <p className="text-xs text-gray-400 truncate mt-1">{reply.subject}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Execution Trace Panel */}
                  <details className="group mt-auto border-t border-white/10 pt-4">
                    <summary className="cursor-pointer text-xs font-mono text-gray-500 hover:text-gray-300 flex items-center gap-2 transition-colors">
                      <Terminal size={12} />
                      Reply Execution Trace
                    </summary>
                    <div className="mt-3 bg-black/60 p-3 rounded border border-white/10 text-[10px] font-mono text-gray-400 overflow-x-auto">
                      <div className="text-green-400 mb-1">$&gt; system.trace.latest_action</div>
                      {sentReplies.length > 0 ? (
                        <>
                          <div className="mb-2 text-blue-400">payload = {JSON.stringify({
                            to: sentReplies[sentReplies.length-1].to,
                            subject: sentReplies[sentReplies.length-1].subject,
                            threadId: sentReplies[sentReplies.length-1].threadId,
                            messageId: sentReplies[sentReplies.length-1].messageId
                          }, null, 2)}</div>
                          <div className="text-emerald-400">[Gmail API] 200 OK - Reply successfully threaded and dispatched.</div>
                        </>
                      ) : (
                        <div>No execution trace available. Awaiting first send event...</div>
                      )}
                    </div>
                  </details>
                </div>
                </div>
                <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>WhatsApp Intelligence</span>
                  <div className="flex items-center gap-2">
                    {whatsappState.status === 'ready' && (
                      <button
                         onClick={handleLogoutWhatsApp}
                         disabled={isLoggingOut}
                         className={`px-3 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                           isLoggingOut 
                             ? "bg-red-900/50 text-red-500 border-red-900/50 cursor-not-allowed" 
                             : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                         }`}
                      >
                         {isLoggingOut ? "Disconnecting..." : "Logout WhatsApp"}
                      </button>
                    )}
                    <div className={`px-2 py-0.5 rounded-full text-[10px] ${whatsappState.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{whatsappState.status}</div>
                  </div>
                </h3>
                
                {whatsappState.status === 'qr' && whatsappState.qrCode && (
                   <div className="bg-black/20 border border-white/5 p-6 rounded-xl text-center flex flex-col items-center justify-center">
                      <p className="text-sm text-emerald-400 font-bold mb-2">WhatsApp Login Required</p>
                      <p className="text-xs text-gray-400 mb-4">Scan the QR code below or in your terminal using your WhatsApp mobile app.</p>
                      <div className="bg-white p-2 rounded-xl mb-2">
                        <img src={whatsappState.qrCode} alt="WhatsApp Login QR" className="w-32 h-32" />
                      </div>
                      <span className="text-[10px] font-mono text-amber-500 animate-pulse">Awaiting scan...</span>
                   </div>
                )}

                {(!whatsappState.messages || whatsappState.messages.length === 0) && whatsappState.status === 'ready' && (
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl text-center">
                    <p className="text-sm text-gray-400 italic">No recent WhatsApp messages synced.</p>
                  </div>
                )}
                
                {whatsappState.status === 'disconnected' && (
                  <div className="bg-black/20 border border-white/5 p-6 rounded-xl text-center flex flex-col items-center justify-center">
                     <p className="text-sm text-gray-400 mb-4">Connect your personal WhatsApp to sync live chats into the AI Executive OS.</p>
                     <button 
                        onClick={() => {
                           fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-6 rounded-full transition-colors shadow-lg shadow-emerald-500/20"
                     >
                        Connect WhatsApp
                     </button>
                  </div>
                )}
                
                {whatsappState.status === 'ready' && whatsappState.messages?.slice(0, 5).map((msg: any, i: number) => (
                  <div key={i} className="bg-black/40 border border-white/10 p-4 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-emerald-400">{msg.senderName}</span>
                      <span className="text-[10px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg text-sm text-gray-300 mb-2 font-serif italic custom-scrollbar max-h-24 overflow-y-auto">
                      {msg.body}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                         onClick={async () => {
                            setEditingDraft({
                              to: msg.from,
                              subject: "WhatsApp Message",
                              draftReply: "typing...",
                              style: replyStyle,
                              source: 'whatsapp'
                            });
                            try {
                              const res = await fetch('/api/generate-whatsapp-reply', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  to: msg.from,
                                  message: msg.body,
                                  style: replyStyle,
                                  senderName: msg.senderName
                                })
                              });
                              const data = await res.json();
                              if (data.reply) {
                                setEditingDraft({
                                  to: msg.from,
                                  subject: "WhatsApp Message",
                                  draftReply: data.reply,
                                  style: replyStyle,
                                  source: 'whatsapp'
                                });
                              }
                            } catch (e) {
                              console.error("Failed to generate WA reply", e);
                            }
                         }}
                         className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                      >
                        Generate Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Executive Intelligence Feed */}
      {Object.keys(dashboardData).length > 0 && (() => {
        let data = dashboardData;
        
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

      {/* Draft Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
            className="w-full max-w-2xl glass-card border border-white/20 p-0 overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-white/10 bg-black/40">
              <button onClick={() => setEditingDraft(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="text-blue-400" /> Edit Draft Reply
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
                <input type="text" value={editingDraft.to} readOnly className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</label>
                <input type="text" value={editingDraft.subject} onChange={(e) => setEditingDraft({...editingDraft, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Body</label>
                <textarea value={editingDraft.draftReply} onChange={(e) => setEditingDraft({...editingDraft, draftReply: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-48 focus:outline-none focus:border-blue-500 resize-none font-serif"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingDraft(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">Cancel</button>
                <button onClick={() => {
                  setDashboardData((prev: any) => ({
                    ...prev,
                    pendingDrafts: prev.pendingDrafts.map((d: any) => d.emailId === editingDraft.emailId ? editingDraft : d)
                  }));
                  handleApproveAndSend(editingDraft);
                }} disabled={isSending} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-colors">
                  <Send size={16} /> Save & Send
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
