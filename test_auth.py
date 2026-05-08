import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from auth.google_auth import get_auth_url

try:
    print("Generating URL...")
    url, state = get_auth_url()
    print("URL:", url)
except Exception as e:
    import traceback
    traceback.print_exc()
