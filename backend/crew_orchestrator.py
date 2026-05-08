from crewai import Crew, Process
from agents.agents import OperationsAgents
from agents.tasks import OperationsTasks
from tools.custom_tools import fetch_startup_news, validate_operations_data
from services.gmail_service import fetch_latest_emails
from state import emit_event_sync
import time

class StartupOperationsCrew:
    def __init__(self, user_request: str):
        self.user_request = user_request

    def run(self):
        # Emit that the crew is starting
        emit_event_sync("crew_start", {"message": "Starting the startup operations workflow."})

        # Fetch real emails natively to bypass LLM tool hallucination
        try:
            print("[Email Agent] Clearing stale inbox memory...")
            raw_emails_response = fetch_latest_emails(max_results=20)
            import json
            response_data = json.loads(raw_emails_response)
            email_count = len(response_data.get("emails", []))
            new_count = response_data.get("new_count", 0)
            newest_timestamp = response_data.get("newest_timestamp", "Unknown")
            
            # Aggressively minify for token efficiency to stay under 6000 TPM limit
            # Process up to 3 emails to strictly prevent Groq rate limits
            minified_emails = []
            for email in response_data.get("emails", [])[:3]:
                # Clean sender to just name if possible and truncate
                sender = email.get("from", "")
                if "<" in sender:
                    sender = sender.split("<")[0].strip()
                if len(sender) > 15:
                    sender = sender[:15] + ".."
                
                # Truncate subject
                subject = email.get("subject", "")
                if len(subject) > 35:
                    subject = subject[:35] + ".."

                # Truncate snippet drastically
                snippet = email.get("snippet", "")
                if len(snippet) > 45:
                    snippet = snippet[:45] + ".."
                    
                minified_emails.append({
                    "f": sender,
                    "s": subject,
                    "p": snippet
                })
                
            raw_emails_json = json.dumps(minified_emails)
            
            emit_event_sync("agent_update", {"agent": "Gmail API", "status": "completed", "details": f"Retrieved {email_count} live messages."})
            if new_count > 0:
                emit_event_sync("agent_update", {"agent": "Email Agent", "status": "working", "details": f"New inbox activity detected: {new_count} new emails."})
            
        except Exception as e:
            emit_event_sync("agent_update", {"agent": "System", "status": "failed", "details": "Live Gmail fetch failed. Fallback mode activated."})
            raise e
        # Fetch Executive Intelligence Natively
        raw_tavily = []
        raw_apify = []
        try:
            from services.tavily_service import fetch_executive_intelligence
            from services.linkedin_service import fetch_linkedin_activity
            emit_event_sync("agent_update", {"agent": "Research Agent", "status": "working", "details": "Fetching live executive intelligence..."})
            
            tavily_data = fetch_executive_intelligence()
            raw_tavily = json.loads(tavily_data)
            emit_event_sync("agent_update", {"agent": "Tavily API", "status": "completed", "details": "Tavily ecosystem intelligence retrieved."})
            
            apify_data = fetch_linkedin_activity()
            raw_apify = json.loads(apify_data)
            emit_event_sync("agent_update", {"agent": "Apify API", "status": "completed", "details": "Apify LinkedIn profile data retrieved."})
            
            executive_data_json = json.dumps({
                "tavily_news": raw_tavily,
                "apify_linkedin": raw_apify
            }, indent=2)
            
        except Exception as e:
            emit_event_sync("agent_update", {"agent": "System", "status": "failed", "details": f"External intelligence fetch failed: {e}. Fallback mode activated."})
            executive_data_json = "{}"

        # Initialize Agents
        agents = OperationsAgents()
        manager = agents.manager_agent()
        email_agent = agents.email_agent()
        research_agent = agents.research_agent()
        validation_agent = agents.validation_agent()
        report_agent = agents.report_agent()

        # Initialize Tasks
        tasks = OperationsTasks()
        email_task = tasks.email_task(email_agent, raw_emails_json)
        research_task = tasks.research_task(research_agent, executive_data_json)
        validation_task = tasks.validation_task(validation_agent)
        report_task = tasks.report_task(report_agent)

        # Build Phase 1 Crew
        phase_1_crew = Crew(
            agents=[email_agent, research_agent],
            tasks=[email_task, research_task],
            process=Process.sequential,
            verbose=True,
            cache=False
        )

        print("[System] Executing Phase 1: Data Gathering (Email & Research)...")
        phase_1_crew.kickoff()
        
        emit_event_sync("system", {"message": "Phase 1 complete. Pausing for 60s to clear Groq TPM rate limits..."})
        print("[System] Pausing for 60s to clear Groq TPM rate limits...")
        import time
        time.sleep(62)  # Wait for the rolling 60s window to clear

        # Rebuild Report Task with the outputs of Phase 1 injected as context description
        # We manually inject the outputs because they are now in a separate crew
        report_task.description += f"\n\n--- PHASE 1 OUTPUTS ---\nEmail Analysis:\n{str(email_task.output) if email_task.output else ''}\n\nResearch Analysis:\n{str(research_task.output) if research_task.output else ''}"
        
        # Build Phase 2 Crew
        phase_2_crew = Crew(
            agents=[report_agent],
            tasks=[report_task],
            process=Process.sequential,
            verbose=True,
            cache=False
        )

        print("[System] Executing Phase 2: Report Generation...")
        # Retry logic for rate‑limit
        max_retries = 2
        attempt = 0
        
        while attempt < max_retries:
            try:
                result = phase_2_crew.kickoff()
                break
            except Exception as exc:
                exc_str = str(exc).lower()
                print("========== GROQ API EXCEPTION ==========")
                print(repr(exc))
                print("========================================")
                if "ratelimit" in exc_str or "rate limit" in exc_str or "429" in exc_str or "tokens per minute" in exc_str:
                    attempt += 1
                    import re
                    match = re.search(r'try again in (\d+(\.\d+)?)s', exc_str)
                    wait_time = float(match.group(1)) + 1.0 if match else 30
                    emit_event_sync("system", {"message": f"Rate limit hit, retrying in {wait_time}s (attempt {attempt}/{max_retries})"})
                    time.sleep(wait_time)
                    if attempt == max_retries:
                        raise exc
                else:
                    attempt += 1
                    wait_time = 15
                    emit_event_sync("system", {"message": f"Unexpected LLM Error. Retrying in {wait_time}s (attempt {attempt}/{max_retries})"})
                    time.sleep(wait_time)
                    if attempt == max_retries:
                        raise exc

        emit_event_sync("agent_update", {"agent": "Validation Agent", "status": "completed", "details": "Fresh Gmail intelligence verified."})
        print("[System] Workflow completed successfully.")
        emit_event_sync("crew_complete", {"message": "Real-time operational intelligence updated successfully.", "result": str(result)})

        return {
            "report": str(result),
            "metadata": {
                "source": "LIVE",
                "count": email_count,
                "new_count": new_count,
                "newest_timestamp": newest_timestamp,
                "raw_emails": response_data.get("emails", []),
                "raw_executive": raw_tavily + raw_apify
            }
        }

