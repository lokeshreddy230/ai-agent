from crewai.tools import tool
from services.gmail_service import fetch_latest_emails

@tool("Fetch Real Emails")
def fetch_real_emails(query: str) -> str:
    """Fetches real recent emails from the authenticated user's Gmail inbox. 
    You MUST pass query='inbox' when calling this tool."""
    print("[Email Agent] Connected to Gmail successfully.")
    return fetch_latest_emails(max_results=20)
