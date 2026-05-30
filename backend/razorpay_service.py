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


def is_live() -> bool:
    return bool(os.environ.get("RAZORPAY_KEY_ID")) and bool(os.environ.get("RAZORPAY_KEY_SECRET"))


def _client():
    import razorpay
    return razorpay.Client(auth=(
        os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"],
    ))


def create_order(tier: str, user_id: str) -> dict:
    if tier not in PRICING:
        raise ValueError(f"Unknown tier {tier!r}")
    amount = PRICING[tier]["amount_paise"]
    receipt = f"rcpt_{tier}_{user_id[:8]}_{uuid.uuid4().hex[:6]}"

    if is_live():
        client = _client()
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "notes": {"tier": tier, "user_id": user_id},
        })
        return {
            "mode": "live",
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "tier": tier,
            "key_id": os.environ["RAZORPAY_KEY_ID"],
            "label": PRICING[tier]["label"],
        }

    # Mock mode
    return {
        "mode": "mock",
        "order_id": f"order_mock_{uuid.uuid4().hex[:14]}",
        "amount": amount,
        "currency": "INR",
        "receipt": receipt,
        "tier": tier,
        "key_id": None,
        "label": PRICING[tier]["label"],
    }


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not is_live():
        return True  # mock mode accepts anything
    secret = os.environ["RAZORPAY_KEY_SECRET"]
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
