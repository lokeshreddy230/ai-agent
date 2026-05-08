import os
import json
from dotenv import load_dotenv
from apify_client import ApifyClient

load_dotenv()

def fetch_linkedin_activity():
    """
    Fetches public LinkedIn activity for targeted executives using Apify's linkedin-posts-scraper.
    """
    try:
        api_key = os.getenv("APIFY_API_TOKEN")
        if not api_key:
            raise ValueError("APIFY_API_TOKEN is not set.")
            
        client = ApifyClient(api_key)
        
        # Target profile URLs for key figures and funds in AI/Tech
        profile_urls = [
            "https://www.linkedin.com/in/sundarpichai/",
            "https://www.linkedin.com/in/satyanadella/",
            "https://www.linkedin.com/company/openai/",
            "https://www.linkedin.com/company/y-combinator/",
            "https://www.linkedin.com/company/andreessen-horowitz/",
            "https://www.linkedin.com/company/nvidia/"
        ]
        
        print("[Apify] Retrieving latest LinkedIn activity...")
        
        run_input = {
            "profileUrls": profile_urls,
            "maxPosts": 1, # Restricted to 1 per profile to protect Groq TPM limits
            "deepScrape": False
        }
        
        # Run the actor - we use the standard linkedin-profile-posts
        # Using the actor ID: harvestapi/linkedin-profile-posts
        try:
            run = client.actor("harvestapi/linkedin-profile-posts").call(run_input=run_input)
            
            # Fetch results
            results = []
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                author_data = item.get("author", {})
                author_name = "Unknown"
                if isinstance(author_data, dict):
                    author_name = f"{author_data.get('firstName', '')} {author_data.get('lastName', '')}".strip()
                    if not author_name:
                        author_name = author_data.get("name", "Unknown")
                else:
                    author_name = str(author_data)

                pub_data = item.get("postedAt", {})
                pub_date = pub_data.get("date", "Recent") if isinstance(pub_data, dict) else str(pub_data)

                results.append({
                    "author": author_name[:50],
                    "text": item.get("content", "")[:150],  # Extremely aggressive truncate for token efficiency
                    "postUrl": item.get("linkedinUrl", ""),
                    "publishedAt": pub_date,
                    "provider": "Apify LinkedIn Monitor"
                })
                
            return json.dumps(results, indent=2)
        except Exception as api_err:
            print(f"[Apify] Warning: Could not run actor: {api_err}. Returning empty LinkedIn data.")
            return json.dumps([], indent=2)
        
    except Exception as e:
        print(f"[Apify] Error retrieving LinkedIn activity: {e}")
        raise e
