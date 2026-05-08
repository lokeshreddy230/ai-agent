from pydantic import BaseModel

class ReportRequest(BaseModel):
    user_request: str = "Generate Daily Startup Report"
