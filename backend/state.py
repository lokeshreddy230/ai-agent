import asyncio

event_queue = None
main_loop = None

def get_queue():
    global event_queue, main_loop
    if event_queue is None:
        main_loop = asyncio.get_running_loop()
        event_queue = asyncio.Queue()
    return event_queue

import time
from datetime import datetime

def emit_event_sync(event_type: str, data: dict):
    if main_loop is not None and event_queue is not None:
        timestamp = datetime.now().strftime("%H:%M:%S")
        data["timestamp"] = timestamp
        main_loop.call_soon_threadsafe(event_queue.put_nowait, {"type": event_type, "data": data})
