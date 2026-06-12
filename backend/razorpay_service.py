"""Razorpay one-time payment flow.

Two operating modes:

* **Live**  — when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are present in
  the environment. Real INR charges, real signature verification.
* **Mock** — when either env var is missing. Returns a synthetic order; the
  /verify endpoint accepts any payload and upgrades the user's tier. The
  frontend renders a "Demo Mode" notice so this is never silently mistaken
  for a live charge.
"""
from __future__ import annotations

import hmac
import hashlib
import os
import uuid
from typing import Optional

# Pricing (in paise — Razorpay's smallest INR unit)
PRICING = {
    "basic":   {"label": "Sadhaka",  "amount_paise":  9900},  # ₹99
    "premium": {"label": "Jyotishi", "amount_paise": 99900},  # ₹999
}


def _key(name: str) -> str:
    """Read a Razorpay env key defensively — strips whitespace and stray quotes
    that some deployment env-injection layers leave around values."""
    return os.environ.get(name, "").strip().strip('"').strip("'").strip()


def is_live() -> bool:
    return bool(_key("RAZORPAY_KEY_ID")) and bool(_key("RAZORPAY_KEY_SECRET"))


def _client():
    import razorpay
    return razorpay.Client(auth=(
        _key("RAZORPAY_KEY_ID"), _key("RAZORPAY_KEY_SECRET"),
    ))


def create_order(tier: str, user_id: str) -> dict:
    if tier not in PRICING:
        raise ValueError(f"Unknown tier {tier!r}")
    return create_custom_order(
        amount_paise=PRICING[tier]["amount_paise"],
        label=PRICING[tier]["label"],
        user_id=user_id,
        receipt_prefix=f"rcpt_{tier}",
        notes={"tier": tier, "user_id": user_id},
    )


def create_custom_order(
    *,
    amount_paise: int,
    label: str,
    user_id: str,
    receipt_prefix: str = "rcpt",
    notes: Optional[dict] = None,
) -> dict:
    """Create a Razorpay order for an arbitrary amount/label (used by scheduler bookings,
    where the price isn't tied to a tier)."""
    receipt = f"{receipt_prefix}_{user_id[:8]}_{uuid.uuid4().hex[:6]}"
    note_data = {"user_id": user_id}
    if notes:
        note_data.update(notes)

    if is_live():
        client = _client()
        order = client.order.create({
            "amount":   amount_paise,
            "currency": "INR",
            "receipt":  receipt,
            "notes":    note_data,
        })
        return {
            "mode":     "live",
            "order_id": order["id"],
            "amount":   amount_paise,
            "currency": "INR",
            "receipt":  receipt,
            "key_id":   _key("RAZORPAY_KEY_ID"),
            "label":    label,
        }

    return {
        "mode":     "mock",
        "order_id": f"order_mock_{uuid.uuid4().hex[:14]}",
        "amount":   amount_paise,
        "currency": "INR",
        "receipt":  receipt,
        "key_id":   None,
        "label":    label,
    }


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not is_live():
        return True  # mock mode accepts anything
    secret = _key("RAZORPAY_KEY_SECRET")
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
