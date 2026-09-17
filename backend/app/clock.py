from datetime import datetime, timezone, timedelta
from typing import Optional

# Holds simulated virtual time for test graders
_SIMULATED_TIME: Optional[datetime] = None

def get_now() -> datetime:
    """Return the current simulated time if set, otherwise real UTC time."""
    if _SIMULATED_TIME is not None:
        return _SIMULATED_TIME
    return datetime.now(timezone.utc)

def set_clock(new_time: datetime):
    """Set the system's simulated clock."""
    global _SIMULATED_TIME
    _SIMULATED_TIME = new_time

def advance_clock(days: int = 0, seconds: int = 0):
    """Advance the clock by specified days and seconds."""
    global _SIMULATED_TIME
    current = get_now()
    _SIMULATED_TIME = current + timedelta(days=days, seconds=seconds)
    return _SIMULATED_TIME

def reset_clock():
    """Reset clock back to real system time."""
    global _SIMULATED_TIME
    _SIMULATED_TIME = None
