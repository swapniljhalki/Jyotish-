"""Daily Panchang + festival calendar.

Panchang fields are computed live via Swiss Ephemeris using the same
Lahiri/Moshier setup as kundali.py. Festivals are curated dates — replace
with a real Drik panchang library when scaling internationally.
"""
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo

import swisseph as swe

# Reuse the global SIDM setting (kundali.py sets SIDM_LAHIRI on import; we
# also set it here defensively in case panchang is imported first.)
swe.set_sid_mode(swe.SIDM_LAHIRI)
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SPEED | swe.FLG_MOSEPH

TITHI_NAMES = [
    "Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Purnima",
    "Pratipada", "Dvitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dvadashi", "Trayodashi", "Chaturdashi", "Amavasya",
]
NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha",
    "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
    "Uttara Bhadrapada", "Revati",
]
YOGA_NAMES = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
    "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
    "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]
VARA = {
    0: ("Somavara", "Monday", "Chandra"),
    1: ("Mangalavara", "Tuesday", "Mangala"),
    2: ("Budhavara", "Wednesday", "Budha"),
    3: ("Guruvara", "Thursday", "Guru"),
    4: ("Shukravara", "Friday", "Shukra"),
    5: ("Shanivara", "Saturday", "Shani"),
    6: ("Ravivara", "Sunday", "Surya"),
}


def compute_panchang(target: date | None = None, tz_name: str = "Asia/Kolkata") -> dict:
    """Panchang for noon local time on the given date (defaults to today)."""
    tz = ZoneInfo(tz_name)
    if target is None:
        target = datetime.now(tz).date()
    # Use 12:00 local as the reference moment (avoids edge transitions)
    local_dt = datetime(target.year, target.month, target.day, 12, 0, tzinfo=tz)
    ut = local_dt.astimezone(timezone.utc)
    jd = swe.julday(ut.year, ut.month, ut.day, ut.hour + ut.minute / 60.0)

    sun, _ = swe.calc_ut(jd, swe.SUN, FLAGS)
    moon, _ = swe.calc_ut(jd, swe.MOON, FLAGS)
    sun_lon = sun[0] % 360
    moon_lon = moon[0] % 360

    # Tithi: (moon - sun) / 12  → 0..29
    diff = (moon_lon - sun_lon) % 360
    tithi_index = int(diff / 12)
    tithi_progress = (diff - tithi_index * 12) / 12  # 0..1
    paksha = "Shukla" if tithi_index < 15 else "Krishna"

    # Nakshatra: moon_lon / (360/27) → 0..26
    span = 360 / 27
    nak_index = int(moon_lon // span) % 27
    nak_progress = (moon_lon - nak_index * span) / span
    pada = int((moon_lon - nak_index * span) // (span / 4)) + 1

    # Yoga: (sun + moon) / (360/27)
    yoga_total = (sun_lon + moon_lon) % 360
    yoga_index = int(yoga_total // span) % 27
    yoga_progress = (yoga_total - yoga_index * span) / span

    # Vara (weekday)
    weekday = local_dt.weekday()
    vara_sk, vara_en, lord = VARA[weekday]

    # Sun/Moon sign for the day
    sun_sign_idx = int(sun_lon // 30)
    moon_sign_idx = int(moon_lon // 30)
    SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
             "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

    return {
        "date": target.isoformat(),
        "timezone": tz_name,
        "tithi": {
            "name": TITHI_NAMES[tithi_index],
            "index": tithi_index + 1,
            "paksha": paksha,
            "progress": round(tithi_progress * 100, 1),
        },
        "nakshatra": {
            "name": NAKSHATRA_NAMES[nak_index],
            "index": nak_index + 1,
            "pada": pada,
            "progress": round(nak_progress * 100, 1),
        },
        "yoga": {
            "name": YOGA_NAMES[yoga_index],
            "index": yoga_index + 1,
            "progress": round(yoga_progress * 100, 1),
        },
        "vara": {"sanskrit": vara_sk, "english": vara_en, "lord": lord},
        "sun_sign": SIGNS[sun_sign_idx],
        "moon_sign": SIGNS[moon_sign_idx],
    }


# --- Curated Hindu festival calendar ---
# Best-effort traditional dates (Drik panchang). For production, swap with a
# real panchang library or external API.
_FESTIVALS = [
    # 2026
    ("2026-02-15", "Maha Shivaratri", "The great night of Shiva — fasting, jagran, abhisheka of the lingam."),
    ("2026-03-03", "Holika Dahan", "Bonfire on the eve of Holi — the burning of evil."),
    ("2026-03-04", "Holi", "The festival of colours — celebrating divine love and the arrival of spring."),
    ("2026-03-27", "Ram Navami", "Birth of Lord Rama — the seventh avatar of Vishnu."),
    ("2026-04-14", "Baisakhi / Mesha Sankranti", "Solar New Year — the Sun enters Aries."),
    ("2026-05-01", "Akshaya Tritiya", "Eternally auspicious day — every action multiplies in merit."),
    ("2026-05-31", "Buddha Purnima", "Birth, enlightenment and mahaparinirvana of Gautama Buddha."),
    ("2026-07-29", "Guru Purnima", "Honouring the spiritual teacher and Veda Vyasa."),
    ("2026-08-09", "Raksha Bandhan", "The sacred thread of protection between siblings."),
    ("2026-08-16", "Krishna Janmashtami", "Birth of Lord Krishna at midnight in Mathura."),
    ("2026-08-27", "Ganesh Chaturthi", "Arrival of Lord Ganesha — remover of obstacles."),
    ("2026-09-23", "Sharad Navratri begins", "Nine nights of the Devi — fasting and goddess worship."),
    ("2026-10-01", "Dussehra / Vijayadashami", "Victory of Rama over Ravana — triumph of dharma."),
    ("2026-10-29", "Karwa Chauth", "Married women's fast for the long life of their husbands."),
    ("2026-11-07", "Dhanteras", "Worship of Dhanvantari and Lakshmi — beginning of Diwali."),
    ("2026-11-08", "Diwali", "Festival of lights — Lakshmi puja, the return of Rama to Ayodhya."),
    ("2026-11-09", "Govardhan Puja", "Krishna lifts mount Govardhan — gratitude to nature."),
    ("2026-11-10", "Bhai Dooj", "Sisters' tilak for brothers — sacred sibling bond."),
    ("2026-11-21", "Tulsi Vivah", "Symbolic marriage of Tulsi to Vishnu — onset of the wedding season."),
    ("2026-12-25", "Christmas", "Birth of Jesus Christ — celebrated across many traditions in India."),
    # 2027
    ("2027-01-14", "Makar Sankranti", "The Sun enters Capricorn — Uttarayana begins."),
    ("2027-01-22", "Vasant Panchami", "Saraswati puja — invocation of knowledge and the arts."),
    ("2027-02-12", "Maha Shivaratri", "The great night of Shiva."),
    ("2027-03-22", "Holi", "Festival of colours."),
    ("2027-04-15", "Ram Navami", "Birth of Lord Rama."),
]


def get_upcoming_festivals(limit: int = 6, today: date | None = None) -> list:
    if today is None:
        today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    rows = []
    for d_str, name, desc in _FESTIVALS:
        d = date.fromisoformat(d_str)
        if d >= today:
            days = (d - today).days
            rows.append({
                "date": d_str,
                "name": name,
                "description": desc,
                "days_until": days,
                "weekday": d.strftime("%A"),
            })
        if len(rows) >= limit:
            break
    return rows
