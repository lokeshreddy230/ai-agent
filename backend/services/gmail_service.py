import base64
import json
import concurrent.futures
from googleapiclient.discovery import build
from auth.google_auth import get_credentials

_last_seen_message_ids = set()
MAX_EMAIL_FETCH_LIMIT = 20

def fetch_latest_emails(max_results=20):
    """Fetches the latest emails from the authenticated user's Gmail inbox."""
    global _last_seen_message_ids
    
    if max_results > MAX_EMAIL_FETCH_LIMIT:
        print(f"[System] Scaling down fetch from {max_results} to {MAX_EMAIL_FETCH_LIMIT}")
        max_results = MAX_EMAIL_FETCH_LIMIT

    try:
        creds = get_credentials()
        if not creds:
            raise Exception("No valid Gmail credentials found.")

        service = build('gmail', 'v1', credentials=creds)
        
        print("[Gmail API] Fetching newest inbox messages...")
        # Call the Gmail API
        results = service.users().messages().list(
            userId='me', 
            maxResults=max_results, 
            labelIds=['INBOX'],
            includeSpamTrash=False
        ).execute()
        messages = results.get('messages', [])

        if not messages:
            print("[Gmail API] No recent messages found in inbox.")
            return json.dumps({"emails": [], "new_count": 0})
            
        print(f"[Gmail API] Retrieved {len(messages)} live emails.")
        
        current_ids = set(msg['id'] for msg in messages)
        new_ids = current_ids - _last_seen_message_ids
        new_count = len(new_ids) if _last_seen_message_ids else len(current_ids)
        
        print(f"[Email Agent] {new_count} new emails detected since last sync.")
        
        _last_seen_message_ids = current_ids

        email_data = []
        
        print(f"[Gmail API] Fetching details for {len(messages)} messages sequentially...")
        for msg in messages:
            try:
                msg_id = msg['id']
                # Use format='metadata' to only fetch headers and snippet
                message = service.users().messages().get(
                    userId='me', id=msg_id, format='metadata', metadataHeaders=['Subject', 'From', 'Date']
                ).execute()
                
                payload = message.get('payload', {})
                headers = payload.get('headers', [])
                
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
                date = next((h['value'] for h in headers if h['name'] == 'Date'), 'Unknown Date')
                snippet_raw = message.get('snippet', '')
                snippet = snippet_raw.replace('"', "'").replace('\\', '').replace('\n', ' ')[:500]  # Sanitize to prevent LLM JSON errors
                
                internal_date = int(message.get('internalDate', 0))
                
                email_data.append({
                    "from": sender,
                    "date": date,
                    "subject": subject,
                    "snippet": snippet,
                    "internalDate": internal_date
                })
            except Exception as e:
                print(f"[Gmail API] Failed to fetch details for msg {msg.get('id')}: {e}")
                
        print("[Preprocessor] Compressed inbox payload successfully.")
            
        # Sort explicitly by internalDate descending (newest first)
        email_data.sort(key=lambda x: x['internalDate'], reverse=True)
        
        newest_timestamp = "Unknown"
        if email_data:
            from datetime import datetime, timezone
            newest_timestamp_sec = email_data[0]['internalDate'] / 1000.0
            newest_timestamp = datetime.fromtimestamp(newest_timestamp_sec, tz=timezone.utc).isoformat()
            print(f"[Gmail API] Latest email timestamp: {newest_timestamp}")
            print("[Email Agent] Newest inbox message detected.")
            
        return json.dumps({"emails": email_data, "new_count": new_count, "newest_timestamp": newest_timestamp}, indent=2)
        
    except Exception as error:
        print(f"[Gmail API] Live fetch failed: {error}")
        raise error
