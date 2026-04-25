"""Geocoding using OpenStreetMap Nominatim (free, no API key).
Results cached in MongoDB to be polite to the public service and to make
chart computation deterministic for repeat queries.
"""
import httpx
from typing import Optional

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "JyotishVedic/1.0 (https://kundali-chart-1.preview.emergentagent.com)"


async def geocode_place(db, place: str) -> Optional[dict]:
    """Return {lat, lon, display_name} for a place, or None if not found."""
    place = place.strip()
    if not place:
        return None
    cached = await db.geocode_cache.find_one({"q": place.lower()}, {"_id": 0})
    if cached:
        return {"lat": cached["lat"], "lon": cached["lon"], "display_name": cached["display_name"]}
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.get(
                NOMINATIM_URL,
                params={"q": place, "format": "json", "limit": 1},
                headers={"User-Agent": USER_AGENT},
            )
        except Exception:
            return None
    if r.status_code != 200:
        return None
    data = r.json()
    if not data:
        return None
    lat = float(data[0]["lat"])
    lon = float(data[0]["lon"])
    display = data[0].get("display_name", place)
    await db.geocode_cache.insert_one({
        "q": place.lower(), "lat": lat, "lon": lon, "display_name": display,
    })
    return {"lat": lat, "lon": lon, "display_name": display}
