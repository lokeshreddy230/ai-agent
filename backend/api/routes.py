import asyncio
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models import ReportRequest
from state import event_queue
from crew_orchestrator import StartupOperationsCrew
import concurrent.futures
from auth.google_auth import get_credentials, is_authenticated, get_auth_url, save_credentials_from_code
from fastapi.responses import RedirectResponse

router = APIRouter()

@router.post("/generate-report")
async def generate_report(request: ReportRequest):
    from state import get_queue
    get_queue() # Ensure queue and main_loop are initialized
    try:
        loop = asyncio.get_running_loop()
        
        def run_crew():
            crew = StartupOperationsCrew(request.user_request)
            return crew.run()

        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(pool, run_crew)
            
        # Validate that the LLM generated valid JSON
        import json
        import re
        raw_report = result["report"]
        cleaned_report = re.sub(r'```json', '', raw_report)
        cleaned_report = re.sub(r'```', '', cleaned_report).strip()
        
        try:
            json.loads(cleaned_report)
        except json.JSONDecodeError as e:
            raise Exception(f"LLM generated invalid JSON: {e}")

        return {"status": "success", "report": cleaned_report, "metadata": result["metadata"]}
    except Exception as e:
        import traceback
        traceback.print_exc()
        from state import emit_event_sync
        emit_event_sync("agent_update", {"agent": "System", "status": "failed", "details": f"Error: {str(e)}"})
        
        # Rescue real emails so the user can still see them even if the AI fails
        rescued_emails = []
        try:
            from services.gmail_service import fetch_latest_emails
            import json
            emails_json = fetch_latest_emails(max_results=20)
            parsed = json.loads(emails_json)
            rescued_emails = parsed.get("emails", [])
        except Exception as rescue_e:
            print(f"Failed to rescue emails: {rescue_e}")

        return {"status": "error", "message": str(e), "fallback_required": True, "rescued_emails": rescued_emails}

@router.get("/agent-status")
async def agent_status():
    from state import get_queue
    q = get_queue()
    async def event_generator():
        while True:
            event = await q.get()
            import json
            yield f"data: {json.dumps(event)}\n\n"
            q.task_done()
            if event.get("type") == "crew_complete":
                break
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/news")
async def get_mock_news():
    from tools.custom_tools import fetch_startup_news
    return {"news": fetch_startup_news("")}

@router.get("/emails")
async def get_mock_emails():
    from tools.custom_tools import fetch_mock_emails
    return {"emails": fetch_mock_emails("")}

@router.get("/auth/status")
async def get_auth_status():
    return {"authenticated": is_authenticated()}

@router.get("/auth/login")
async def login():
    """Returns the Google Auth URL to the frontend."""
    try:
        auth_url, state = get_auth_url()
        return {"status": "success", "url": auth_url}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/auth/callback")
async def auth_callback(code: str, state: str = None):
    """Handles the callback from Google, exchanges code for token, and redirects back home."""
    try:
        save_credentials_from_code(code, state)
        # Redirect back to the frontend
        return RedirectResponse(url="http://localhost:3000?auth=success")
    except Exception as e:
        return {"status": "error", "message": str(e)}
@router.get("/health")
async def health_check():
    return {"status": "ready"}

@router.get("/auth/debug")
async def auth_debug():
    creds = get_credentials()
    if not creds:
        return {"authenticated": False, "reason": "No credentials file"}
    if creds.expired and creds.refresh_token:
        return {"authenticated": False, "reason": "Credentials expired, refresh token available"}
    return {"authenticated": creds.valid, "expires": getattr(creds, "expiry", None)}
