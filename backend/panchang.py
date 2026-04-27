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


def compute_panchang(target: date | None = None, tz_name: str = "Asia/Kolkata",
                     hour: int = 12, minute: int = 0) -> dict:
    """Panchang for a specific local moment on the given date.

    `hour`/`minute` lets the caller compute panchang at sunrise (~6:00) for
    festival rules (Drik standard) instead of at noon (default).
    """
    tz = ZoneInfo(tz_name)
    if target is None:
        target = datetime.now(tz).date()
    local_dt = datetime(target.year, target.month, target.day, hour, minute, tzinfo=tz)
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


# --- Hindu festival calendar (computed dynamically) ---
# Each tithi-based festival is keyed by (tithi_index 1..30, lunar_month_rashi 0..11).
# `lunar_month_rashi` = Sun's sidereal rashi AT the Shukla Pratipada that started
# the lunar month containing this festival (Amanta convention).
#
# Lunar months → starting Sun rashi:
#   Chaitra=11 (Pisces), Vaishakha=0 (Aries), Jyeshtha=1 (Taurus),
#   Ashadha=2 (Gemini),  Shravana=3 (Cancer), Bhadrapada=4 (Leo),
#   Ashwin=5 (Virgo),    Kartik=6 (Libra),    Margashirsha=7 (Scorpio),
#   Pausha=8 (Sagittarius), Magha=9 (Capricorn), Phalguna=10 (Aquarius)

TITHI_FESTIVALS = [
    # (name, description, tithi 1..30, lunar_month_rashi)
    ("Vasant Panchami", "Saraswati puja — invocation of knowledge and the arts.", 5, 9),
    ("Maha Shivaratri", "The great night of Shiva — fasting, jagran, abhisheka of the lingam.", 29, 9),
    ("Holika Dahan", "Bonfire on the eve of Holi — the burning of evil.", 15, 10),
    ("Holi", "The festival of colours — celebrating divine love and the arrival of spring.", 16, 10),
    ("Ram Navami", "Birth of Lord Rama — the seventh avatar of Vishnu.", 9, 11),
    ("Hanuman Jayanti", "Birth of Lord Hanuman — the embodiment of devotion and strength.", 15, 11),
    ("Akshaya Tritiya", "Eternally auspicious day — every action multiplies in merit.", 3, 0),
    ("Buddha Purnima", "Birth, enlightenment and mahaparinirvana of Gautama Buddha.", 15, 0),
    ("Guru Purnima", "Honouring the spiritual teacher and Veda Vyasa.", 15, 2),
    ("Raksha Bandhan", "The sacred thread of protection between siblings.", 15, 3),
    ("Ganesh Chaturthi", "Arrival of Lord Ganesha — remover of obstacles.", 4, 4),
    ("Krishna Janmashtami", "Birth of Lord Krishna at midnight in Mathura.", 23, 3),
    ("Sharad Navratri begins", "Nine nights of the Devi — fasting and goddess worship.", 1, 5),
    ("Vijayadashami / Dussehra", "Victory of Rama over Ravana — triumph of dharma.", 10, 5),
    ("Karwa Chauth", "Married women's fast for the long life of their husbands.", 19, 5),
    ("Dhanteras", "Worship of Dhanvantari and Lakshmi — beginning of Diwali.", 28, 5),
    ("Naraka Chaturdashi", "Choti Diwali — destruction of the demon Narakasura.", 29, 5),
    ("Diwali", "Festival of lights — Lakshmi puja, the return of Rama to Ayodhya.", 30, 5),
    ("Govardhan Puja", "Krishna lifts mount Govardhan — gratitude to nature.", 1, 6),
    ("Bhai Dooj", "Sisters' tilak for brothers — sacred sibling bond.", 2, 6),
    ("Tulsi Vivah", "Symbolic marriage of Tulsi to Vishnu — onset of the wedding season.", 11, 6),
]

# Solar (sankranti) festivals: triggered when Sun enters a specific sidereal rashi
SANKRANTI_FESTIVALS = [
    ("Makar Sankranti / Pongal", "The Sun enters Capricorn — Uttarayana begins.", 9),
    ("Mesha Sankranti / Baisakhi", "Solar New Year — the Sun enters Aries.", 0),
]

# Gregorian fixed-date festivals
FIXED_DATE_FESTIVALS = [
    ("Republic Day", "Republic Day of India.", 1, 26),
    ("Independence Day", "Independence Day of India.", 8, 15),
    ("Christmas", "Birth of Jesus Christ — celebrated across many traditions in India.", 12, 25),
]

_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]


def _tithi_in_day_window(d: date, target_tithi: int,
                         tz_name: str = "Asia/Kolkata") -> bool:
    """True if `target_tithi` (1..30) prevails at any time during local day `d`,
    using the Drik convention that the day's tithi covers from sunrise (~06:00)
    to next sunrise."""
    t_start = compute_panchang(d, tz_name=tz_name, hour=6)["tithi"]["index"]
    t_end = compute_panchang(d + timedelta(days=1), tz_name=tz_name, hour=6)["tithi"]["index"]
    if t_start == t_end:
        return target_tithi == t_start
    if t_start < t_end:
        return t_start <= target_tithi <= t_end
    # t_start > t_end → wraparound (e.g. 30 → 1 → 2)
    return target_tithi >= t_start or target_tithi <= t_end


def _sunrise_tithi(d: date, tz_name: str = "Asia/Kolkata") -> int:
    return compute_panchang(d, tz_name=tz_name, hour=6)["tithi"]["index"]


def compute_festivals_for_range(start: date, end: date,
                                tz_name: str = "Asia/Kolkata") -> list[dict]:
    """Compute festival dates between [start, end] by scanning each day,
    tracking the current Amanta lunar-month-start Sun rashi (detected by
    drop in sunrise tithi index between consecutive days, which fires exactly
    once per lunar cycle), and matching tithi+lunar_month rules."""
    found: list[dict] = []
    seen: set[tuple[str, int]] = set()  # (name, year) — dedupe within a year

    # Initialize current_lunar_month_rashi by walking back up to 35 days to
    # find the most recent lunar month start. We detect that by finding a day
    # whose sunrise tithi is LESS than the previous day's — a new-moon crossing.
    current_lunar_month_rashi: int | None = None
    init_back_t = _sunrise_tithi(start, tz_name=tz_name)
    for back in range(1, 36):
        d_back = start - timedelta(days=back)
        t_back = _sunrise_tithi(d_back, tz_name=tz_name)
        if t_back > init_back_t:
            # init_back_t is from a day after the new-moon drop, so the lunar
            # month started somewhere in [d_back+1 .. start]. Use the first
            # day with sunrise tithi <= 3 going forward as the Pratipada day.
            d_search = d_back + timedelta(days=1)
            while d_search <= start:
                if _sunrise_tithi(d_search, tz_name=tz_name) <= 3:
                    current_lunar_month_rashi = _SIGNS.index(
                        compute_panchang(d_search, tz_name=tz_name)["sun_sign"]
                    )
                    break
                d_search += timedelta(days=1)
            break
        init_back_t = t_back

    sun_prev_rashi = None
    prev_sunrise_tithi: int | None = None

    d = start
    while d <= end:
        p = compute_panchang(d, tz_name=tz_name)
        sun_rashi = _SIGNS.index(p["sun_sign"])
        cur_sunrise_t = _sunrise_tithi(d, tz_name=tz_name)

        # New Amanta lunar month: today's sunrise tithi is LESS than yesterday's
        # (i.e. tithi index dropped from ~30 down to 1, 2, or 3 — a new moon
        # crossing). We read Sun rashi from YESTERDAY's noon, which is closer
        # to the actual Amavasya/Pratipada moment and gives correct lunar-month
        # names in Adhik Mas (leap month) years where Sun is on a rashi boundary.
        if prev_sunrise_tithi is not None and cur_sunrise_t < prev_sunrise_tithi:
            yesterday_sun = compute_panchang(d - timedelta(days=1), tz_name=tz_name)["sun_sign"]
            current_lunar_month_rashi = _SIGNS.index(yesterday_sun)
        prev_sunrise_tithi = cur_sunrise_t

        # Tithi-based festivals: window check + lunar month must match
        if current_lunar_month_rashi is not None:
            for name, desc, target_tithi, target_lm in TITHI_FESTIVALS:
                if target_lm != current_lunar_month_rashi:
                    continue
                if not _tithi_in_day_window(d, target_tithi, tz_name=tz_name):
                    continue
                key = (name, d.year)
                if key not in seen:
                    seen.add(key)
                    found.append({"date": d.isoformat(), "name": name, "description": desc})

        # Sankranti — captured on day Sun crosses into a target rashi
        if sun_prev_rashi is not None and sun_prev_rashi != sun_rashi:
            for name, desc, target_rashi in SANKRANTI_FESTIVALS:
                if sun_rashi == target_rashi:
                    key = (name, d.year)
                    if key not in seen:
                        seen.add(key)
                        found.append({"date": d.isoformat(), "name": name, "description": desc})
        sun_prev_rashi = sun_rashi
        d += timedelta(days=1)

    # Fixed Gregorian-date festivals
    for year in range(start.year, end.year + 1):
        for name, desc, month, day in FIXED_DATE_FESTIVALS:
            try:
                fd = date(year, month, day)
            except ValueError:
                continue
            if start <= fd <= end:
                found.append({"date": fd.isoformat(), "name": name, "description": desc})

    return sorted(found, key=lambda x: (x["date"], x["name"]))


# Process-level cache. Recomputed when "today" changes (i.e. once per day).
_festival_cache: dict = {"computed_for": None, "festivals": []}


def get_upcoming_festivals(limit: int = 6, today: date | None = None,
                           tz_name: str = "Asia/Kolkata") -> list[dict]:
    if today is None:
        today = datetime.now(ZoneInfo(tz_name)).date()
    if _festival_cache["computed_for"] != today:
        end = today + timedelta(days=400)
        _festival_cache["festivals"] = compute_festivals_for_range(today, end, tz_name=tz_name)
        _festival_cache["computed_for"] = today

    rows = []
    for f in _festival_cache["festivals"]:
        fd = date.fromisoformat(f["date"])
        days = (fd - today).days
        if days < 0:
            continue
        rows.append({
            **f,
            "days_until": days,
            "weekday": fd.strftime("%A"),
        })
        if len(rows) >= limit:
            break
    return rows


def get_festivals_for_year(year: int, tz_name: str = "Asia/Kolkata") -> list[dict]:
    return compute_festivals_for_range(date(year, 1, 1), date(year, 12, 31), tz_name=tz_name)
