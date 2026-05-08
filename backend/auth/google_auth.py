import os
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

_flows = {}

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_credentials():
    """Gets valid user credentials from storage."""
    token_path = os.path.join(os.path.dirname(__file__), '..', 'token.json')
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        if creds and creds.valid:
            return creds
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(token_path, 'w') as token:
                token.write(creds.to_json())
            return creds
    return None

def get_auth_url():
    """Generates an authorization URL for the user to visit."""
    creds_path = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
    flow = InstalledAppFlow.from_client_secrets_file(
        creds_path, 
        SCOPES, 
        redirect_uri='http://localhost:8000/auth/callback'
    )
    auth_url, state = flow.authorization_url(prompt='consent', access_type='offline')
    _flows[state] = flow
    return auth_url, state

def save_credentials_from_code(code, state=None):
    """Exchanges an auth code for credentials and saves them."""
    token_path = os.path.join(os.path.dirname(__file__), '..', 'token.json')
    if state and state in _flows:
        flow = _flows.pop(state)
    else:
        creds_path = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
        flow = InstalledAppFlow.from_client_secrets_file(
            creds_path, 
            SCOPES, 
            redirect_uri='http://localhost:8000/auth/callback'
        )
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(token_path, 'w') as token:
        token.write(creds.to_json())
    return creds

def is_authenticated():
    """Returns True if the backend already has a valid token."""
    creds = get_credentials()
    return creds is not None and creds.valid
