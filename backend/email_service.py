"""Mock email service — logs to stdout + stores in MongoDB `email_outbox`
so the admin panel can view everything that would have been sent.
Swap `send_email()` for a real provider (Resend, SendGrid) later with zero
changes elsewhere.
"""
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def send_email(db, *, to: str, subject: str, body: str, kind: str = "generic"):
    """Pretend to send an email — log + persist to `email_outbox`."""
    doc = {
        "id": str(uuid.uuid4()),
        "to": to,
        "subject": subject,
        "body": body,
        "kind": kind,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.email_outbox.insert_one(doc.copy())
    logger.info("----- MOCK EMAIL -----")
    logger.info(f"  To: {to}")
    logger.info(f"  Subject: {subject}")
    logger.info(f"  Body:\n{body}")
    logger.info("----------------------")
    return doc
