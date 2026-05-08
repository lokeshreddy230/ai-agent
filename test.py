import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from crew_orchestrator import StartupOperationsCrew

try:
    print("Starting Crew...")
    crew = StartupOperationsCrew("Generate Daily Startup Report")
    result = crew.run()
    print("Result:", result)
except Exception as e:
    import traceback
    traceback.print_exc()
