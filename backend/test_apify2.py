import os
from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()
client = ApifyClient(os.getenv('APIFY_API_TOKEN'))
run = client.actor('harvestapi/linkedin-profile-posts').call(run_input={'profileUrls': ['https://www.linkedin.com/in/sundarpichai/'], 'maxPosts': 1})
item = list(client.dataset(run['defaultDatasetId']).iterate_items())[0]

author = item.get('author')
if isinstance(author, dict):
    author = author.get('firstName', '') + ' ' + author.get('lastName', '')
    if not author.strip():
        author = author.get('name', 'Unknown')
print(f"author: {author}")
print(f"text: {item.get('content')}")
print(f"postUrl: {item.get('linkedinUrl')}")
print(f"publishedAt: {item.get('postedAt')}")
