from crewai.tools import tool
import random



@tool("Fetch Startup News")
def fetch_startup_news(query: str) -> str:
    """Fetches latest startup, AI, and competitor news."""
    news = [
        "Competitor XYZ launched an AI feature.",
        "OpenAI released a new model."
    ]
    return "\\n---\\n".join(news)

@tool("Validate Operations Data")
def validate_operations_data(data: str) -> str:
    """Validates the structure and completeness of operations data. Returns 'VALID' or missing issues."""
    if "Investor" not in data or "Competitor" not in data:
         # Simulate self-correction trigger
         return "INVALID: Missing key information about investors or competitors. Please retry fetching and analyzing data."
    return "VALID: Data looks complete and actionable."
