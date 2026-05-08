import os
import json
from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv()

def fetch_executive_intelligence():
    """
    Fetches real-time ecosystem intelligence using Tavily API.
    Targets executives like Sundar Pichai, Elon Musk, Satya Nadella, OpenAI, etc.
    """
    try:
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            raise ValueError("TAVILY_API_KEY is not set.")
        
        client = TavilyClient(api_key=api_key)
        
        # We search for recent high-level ecosystem and executive news
        query = "Latest strategic updates, announcements, AI infrastructure, or ecosystem news from Sundar Pichai, Elon Musk, Satya Nadella, Sam Altman, Jensen Huang, Mark Zuckerberg, Demis Hassabis, Aravind Srinivas, Dario Amodei, Y Combinator, a16z, Sequoia Capital, OpenAI, NVIDIA AI, Google DeepMind, SpaceX, Anthropic"
        
        print("[Tavily] Fetching executive intelligence...")
        response = client.search(
            query=query, 
            search_depth="advanced", 
            topic="news",
            max_results=2
        )
        
        results = response.get('results', [])
        
        # Format the output clearly for the LLM
        formatted_intel = []
        for res in results:
            formatted_intel.append({
                "title": res.get("title", "No Title"),
                "url": res.get("url", ""),
                "content": res.get("content", "")[:150],  # Aggressive truncate for token efficiency
                "published_date": res.get("published_date", "Recent"),
                "provider": "Tavily API"
            })
            
        return json.dumps(formatted_intel, indent=2)
        
    except Exception as e:
        print(f"[Tavily] Error fetching intelligence: {e}")
        raise e
