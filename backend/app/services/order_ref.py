import secrets
from datetime import datetime, timezone


def generate_order_ref() -> str:
    date_part = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = secrets.token_hex(3).upper()
    return f"CMD{date_part}{suffix}"
