import sys
import traceback
from crew_orchestrator import StartupOperationsCrew

try:
    crew = StartupOperationsCrew('Test')
    print(crew.run())
except Exception as e:
    print('CAUGHT EXCEPTION:', repr(e))
    traceback.print_exc()
