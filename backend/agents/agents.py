import os
from dotenv import load_dotenv
from crewai import Agent, LLM
from state import emit_event_sync

load_dotenv()

# Two explicit LLMs to prevent intra-phase token limit overflows (Limit: 6000 TPM)
llm_phase1 = LLM(model="groq/llama-3.1-8b-instant", max_tokens=1500) # Used for Email & Research (Combined < 6000)
llm_phase2 = LLM(model="groq/llama-3.1-8b-instant", max_tokens=2200) # Used for final JSON Generation

def agent_step_callback(agent_name: str):
    def callback(step_output):
        messages = {
            "Manager Agent": "Orchestrating operational workflow...",
            "Email Agent": "Classifying communications and inferring intent...",
            "Research Agent": "Updating market intelligence...",
            "Validation Agent": "Verifying workflow integrity...",
            "Report Agent": "Generating executive intelligence briefing..."
        }
        msg = messages.get(agent_name, "Processing operational data...")
        print(f"[{agent_name}] {msg}")
        emit_event_sync("agent_update", {"agent": agent_name, "status": "working", "details": msg})
    return callback

class OperationsAgents:
    def manager_agent(self):
        return Agent(
            role='Operations Manager',
            goal='Understand user request, delegate tasks, and oversee the entire startup operations workflow.',
            backstory='You are a seasoned startup operations manager. You coordinate the team to ensure nothing falls through the cracks.',
            verbose=True,
            allow_delegation=False,
            llm=llm_phase1,
            step_callback=agent_step_callback("Manager Agent")
        )

    def email_agent(self):
        return Agent(
            role='Executive Operations Director',
            goal='Analyze inbox data, classify communications into strict categories, infer intent, and generate strategic priority levels.',
            backstory='You are a highly analytical AI executive assistant. You do not just read emails; you extract operational intelligence, eliminate noise, and identify core strategic signals.',
            verbose=True,
            allow_delegation=False,
            llm=llm_phase1,
            step_callback=agent_step_callback("Email Agent")
        )

    def research_agent(self):
        return Agent(
            role='Market Researcher',
            goal='Fetch the latest startup and AI news, and monitor competitor activity.',
            backstory='You are always ahead of the curve. You know exactly what competitors are doing and what the latest AI trends are.',
            verbose=True,
            allow_delegation=False,
            llm=llm_phase1,
            step_callback=agent_step_callback("Research Agent")
        )
        
    def validation_agent(self):
        return Agent(
            role='Quality Assurance Validator',
            goal='Verify all collected data. Ensure nothing is missing and retry tasks if necessary.',
            backstory='You have high standards. If the data from other agents is incomplete, you reject it and ask for corrections.',
            verbose=True,
            allow_delegation=False,
            llm=llm_phase1,
            step_callback=agent_step_callback("Validation Agent")
        )

    def report_agent(self):
        return Agent(
            role='Chief Intelligence Officer',
            goal='Synthesize classified findings into a structured, highly actionable JSON intelligence report.',
            backstory='You are the architect of the executive dashboard. You synthesize raw intelligence into perfectly formatted JSON payloads, discarding useless metadata and focusing purely on actionable insights and operational clarity.',
            verbose=True,
            allow_delegation=False,
            llm=llm_phase2,
            step_callback=agent_step_callback("Report Agent")
        )
