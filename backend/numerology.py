"""Vedic Numerology — Mulank, Bhagyank, Naamank computation.

Number → Ruling Planet (Vedic / Cheiro tradition):
    1 = Surya (Sun)            6 = Shukra (Venus)
    2 = Chandra (Moon)         7 = Ketu
    3 = Guru (Jupiter)         8 = Shani (Saturn)
    4 = Rahu                   9 = Mangala (Mars)
    5 = Budha (Mercury)
"""
from datetime import date

# Chaldean letter values — the system used in Vedic numerology.
# 9 is sacred and never assigned to letters.
CHALDEAN_MAP = {
    "A": 1, "I": 1, "J": 1, "Q": 1, "Y": 1,
    "B": 2, "K": 2, "R": 2,
    "C": 3, "G": 3, "L": 3, "S": 3,
    "D": 4, "M": 4, "T": 4,
    "E": 5, "H": 5, "N": 5, "X": 5,
    "U": 6, "V": 6, "W": 6,
    "O": 7, "Z": 7,
    "F": 8, "P": 8,
}

NUMBER_PROFILE: dict[int, dict] = {
    1: {
        "planet": "Surya",
        "planet_english": "Sun",
        "traits": "Leadership, originality, will-power, authority, independence.",
        "lucky_days": ["Sunday", "Monday"],
        "lucky_colors": ["Gold", "Saffron", "Bright Yellow"],
        "lucky_numbers": [1, 4, 9],
        "gemstone": "Ruby (Manik)",
        "deity": "Surya Bhagavan",
        "mantra": "Om Suryaya Namaha",
        "career": "Leadership, government, entrepreneurship, creative arts.",
        "challenges": "Ego, dominance, impatience with subordinates.",
    },
    2: {
        "planet": "Chandra",
        "planet_english": "Moon",
        "traits": "Sensitivity, intuition, diplomacy, emotional depth, nurturing.",
        "lucky_days": ["Monday", "Friday"],
        "lucky_colors": ["Pearl White", "Cream", "Silver"],
        "lucky_numbers": [2, 7, 9],
        "gemstone": "Pearl (Moti)",
        "deity": "Chandra Deva",
        "mantra": "Om Chandraya Namaha",
        "career": "Counselling, hospitality, arts, healthcare, healing professions.",
        "challenges": "Mood swings, over-sensitivity, indecision.",
    },
    3: {
        "planet": "Guru",
        "planet_english": "Jupiter",
        "traits": "Wisdom, optimism, expansion, generosity, teaching.",
        "lucky_days": ["Thursday", "Tuesday", "Friday"],
        "lucky_colors": ["Yellow", "Orange", "Pink"],
        "lucky_numbers": [3, 6, 9],
        "gemstone": "Yellow Sapphire (Pukhraj)",
        "deity": "Brihaspati",
        "mantra": "Om Brihaspataye Namaha",
        "career": "Teaching, law, finance, spiritual guidance, publishing.",
        "challenges": "Over-confidence, dogmatism, over-extension.",
    },
    4: {
        "planet": "Rahu",
        "planet_english": "Rahu (North Node)",
        "traits": "Unconventional thinking, rebellion, rapid material gain, sudden change.",
        "lucky_days": ["Sunday", "Saturday"],
        "lucky_colors": ["Electric Blue", "Grey", "Silver"],
        "lucky_numbers": [4, 8],
        "gemstone": "Hessonite Garnet (Gomed)",
        "deity": "Rahu Deva",
        "mantra": "Om Rahave Namaha",
        "career": "Technology, foreign trade, research, risk-driven ventures.",
        "challenges": "Restlessness, controversy, sudden reversals.",
    },
    5: {
        "planet": "Budha",
        "planet_english": "Mercury",
        "traits": "Quick intelligence, communication, adaptability, commerce.",
        "lucky_days": ["Wednesday", "Friday"],
        "lucky_colors": ["Green", "Light Blue"],
        "lucky_numbers": [5, 6],
        "gemstone": "Emerald (Panna)",
        "deity": "Budha Deva",
        "mantra": "Om Budhaya Namaha",
        "career": "Writing, media, commerce, software, analytics.",
        "challenges": "Restlessness, scattering of energy, nervous tension.",
    },
    6: {
        "planet": "Shukra",
        "planet_english": "Venus",
        "traits": "Beauty, harmony, love, artistic refinement, luxury.",
        "lucky_days": ["Friday", "Tuesday", "Thursday"],
        "lucky_colors": ["Pink", "White", "Pastel Blue"],
        "lucky_numbers": [6, 3, 9],
        "gemstone": "Diamond (Heera)",
        "deity": "Lakshmi / Shukracharya",
        "mantra": "Om Shukraya Namaha",
        "career": "Arts, design, fashion, music, hospitality.",
        "challenges": "Indulgence, vanity, attachment to comforts.",
    },
    7: {
        "planet": "Ketu",
        "planet_english": "Ketu (South Node)",
        "traits": "Mystic depth, introspection, detachment, occult interest.",
        "lucky_days": ["Sunday", "Monday"],
        "lucky_colors": ["Smoky Grey", "Iridescent shades"],
        "lucky_numbers": [7, 2],
        "gemstone": "Cat's Eye (Lehsunia)",
        "deity": "Ketu Deva",
        "mantra": "Om Ketave Namaha",
        "career": "Research, spirituality, healing, philosophy, computing.",
        "challenges": "Isolation, escapism, inner restlessness.",
    },
    8: {
        "planet": "Shani",
        "planet_english": "Saturn",
        "traits": "Discipline, patience, structure, karma, long-term success.",
        "lucky_days": ["Saturday", "Sunday"],
        "lucky_colors": ["Black", "Dark Blue", "Purple"],
        "lucky_numbers": [8, 4],
        "gemstone": "Blue Sapphire (Neelam)",
        "deity": "Shani Bhagavan",
        "mantra": "Om Shanaye Namaha",
        "career": "Engineering, law, real estate, mining, social service.",
        "challenges": "Delay, melancholy, rigidity, harsh self-judgment.",
    },
    9: {
        "planet": "Mangala",
        "planet_english": "Mars",
        "traits": "Courage, drive, energy, protection, athletic prowess.",
        "lucky_days": ["Tuesday", "Friday"],
        "lucky_colors": ["Red", "Crimson", "Coral"],
        "lucky_numbers": [9, 3, 6],
        "gemstone": "Red Coral (Moonga)",
        "deity": "Mangala Deva / Hanuman",
        "mantra": "Om Mangalaya Namaha",
        "career": "Military, sports, surgery, real estate, engineering.",
        "challenges": "Anger, impatience, conflict with authority.",
    },
}


def _reduce(n: int) -> int:
    """Reduce any non-negative integer to a single digit 1-9 by repeatedly
    summing its decimal digits. Zero becomes 9 (no zero in numerology)."""
    n = abs(n)
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n if n != 0 else 9


def compute_mulank(dob: date) -> int:
    """Mulank (Root number) = single-digit reduction of the DAY of birth."""
    return _reduce(dob.day)


def compute_bhagyank(dob: date) -> int:
    """Bhagyank (Destiny number) = single-digit reduction of full DOB digits."""
    digits = f"{dob.year}{dob.month:02d}{dob.day:02d}"
    return _reduce(sum(int(d) for d in digits))


def compute_naamank(full_name: str) -> tuple[int, int]:
    """Naamank (Name number) using Chaldean letter values. Returns (raw_total,
    reduced_single_digit). Non-letters are ignored."""
    total = 0
    for ch in full_name.upper():
        if ch in CHALDEAN_MAP:
            total += CHALDEAN_MAP[ch]
    return total, (_reduce(total) if total > 0 else 0)


# --- Lo Shu Grid (Vedic Numerology Chart / Jeevan Ank Yantra) --------------- #
# The Lo Shu grid arranges numbers 1-9 in a 3×3 magic square where every row,
# column and diagonal sums to 15. In Vedic numerology it's used to visualise a
# person's strengths (present numbers) and growth areas (missing numbers).
#
#   4 | 9 | 2
#   3 | 5 | 7
#   8 | 1 | 6

LO_SHU_POSITIONS: dict[int, tuple[int, int]] = {
    4: (0, 0), 9: (0, 1), 2: (0, 2),
    3: (1, 0), 5: (1, 1), 7: (1, 2),
    8: (2, 0), 1: (2, 1), 6: (2, 2),
}

# Short trait phrase used inside each grid cell.
LO_SHU_NUMBER_MEANINGS: dict[int, str] = {
    1: "Self-expression, communication, career.",
    2: "Sensitivity, intuition, relationships.",
    3: "Imagination, memory, creativity.",
    4: "Discipline, order, practical wisdom.",
    5: "Balance, freedom, purpose.",
    6: "Family, love, artistry, home.",
    7: "Sacrifice, spirituality, learning.",
    8: "Structure, persistence, karma.",
    9: "Ambition, energy, intellect.",
}

# "Arrows" — sets of three positions that form meaningful lines through the
# grid. A COMPLETED arrow (all three numbers present in the DOB) marks a
# strength; a MISSING arrow (all three absent) marks an area for growth.
LO_SHU_ARROWS: list[dict] = [
    # Rows (planes of expression)
    {"nums": (4, 9, 2), "kind": "row",    "label": "Plane of Thought",         "strength": "Mental agility, planner's mind, sharp intellect.", "weakness": "Poor memory, difficulty analysing situations."},
    {"nums": (3, 5, 7), "kind": "row",    "label": "Plane of Emotion",         "strength": "Emotional balance, empathy, artistic sensitivity.", "weakness": "Emotional highs & lows, difficulty expressing feelings."},
    {"nums": (8, 1, 6), "kind": "row",    "label": "Plane of Action",          "strength": "Practicality, willpower, ability to execute.",       "weakness": "Procrastination, lack of grounding."},
    # Columns (planes of will / action / thought)
    {"nums": (4, 3, 8), "kind": "col",    "label": "Plane of Determination",   "strength": "Persistence, hard work, karmic discipline.",         "weakness": "Lack of direction, frequent quitting."},
    {"nums": (9, 5, 1), "kind": "col",    "label": "Plane of Will",            "strength": "Strong will, purpose, self-mastery.",                 "weakness": "Weak willpower, easily swayed."},
    {"nums": (2, 7, 6), "kind": "col",    "label": "Plane of Activity",        "strength": "Practical activity, love of movement & travel.",     "weakness": "Restlessness, difficulty completing tasks."},
    # Diagonals (spiritual & material fortune)
    {"nums": (4, 5, 6), "kind": "diag",   "label": "Plane of Prosperity",      "strength": "Attracts wealth, comfort and abundance.",           "weakness": "Financial ups & downs; must cultivate saving habits."},
    {"nums": (2, 5, 8), "kind": "diag",   "label": "Plane of Spirituality",    "strength": "Wisdom, spiritual insight, karmic clarity.",         "weakness": "Material attachment; disconnection from inner self."},
]


def _lo_shu_digits(dob: date) -> list[int]:
    """Return the multiset of DOB digits to count in the Lo Shu grid.

    Convention used here (standard modern Vedic numerology):
      • Include day, month, year digits (zeros excluded — 0 is not a Lo Shu cell).
      • Also include the Mulank (day-reduced) and Bhagyank (full-DOB-reduced)
        so the driver + conductor numbers reinforce the grid.
    """
    raw = list(f"{dob.year}{dob.month:02d}{dob.day:02d}")
    digits = [int(c) for c in raw if c != "0"]
    digits.append(compute_mulank(dob))
    digits.append(compute_bhagyank(dob))
    return digits


def compute_lo_shu_grid(dob: date) -> dict:
    """Build the Lo Shu (Vedic Numerology) grid for a date of birth.

    Returns:
        {
          "grid": [[{"digit", "count", "meaning"}, …3 cells…], …3 rows…],
          "counts": {1..9: occurrence_count},
          "present": [ints…],  # numbers with count >= 1
          "missing": [ints…],  # numbers with count == 0
          "arrows_present": [ arrows fully completed by DOB ],
          "arrows_missing":  [ arrows fully absent from DOB ],
          "derivation":     "how counts were computed",
        }
    """
    digits = _lo_shu_digits(dob)
    counts = {str(n): digits.count(n) for n in range(1, 10)}

    # 3×3 grid in visual order (row 0 = top)
    grid_layout = [
        [4, 9, 2],
        [3, 5, 7],
        [8, 1, 6],
    ]
    grid = [
        [
            {
                "digit": num,
                "count": counts[str(num)],
                "meaning": LO_SHU_NUMBER_MEANINGS[num],
            }
            for num in row
        ]
        for row in grid_layout
    ]

    present = [n for n in range(1, 10) if counts[str(n)] > 0]
    missing = [n for n in range(1, 10) if counts[str(n)] == 0]

    def _all_present(arrow_nums: tuple) -> bool:
        return all(counts[str(n)] > 0 for n in arrow_nums)

    def _all_missing(arrow_nums: tuple) -> bool:
        return all(counts[str(n)] == 0 for n in arrow_nums)

    arrows_present = [
        {**a, "state": "present"} for a in LO_SHU_ARROWS if _all_present(a["nums"])
    ]
    arrows_missing = [
        {**a, "state": "missing"} for a in LO_SHU_ARROWS if _all_missing(a["nums"])
    ]

    return {
        "label": "Vedic Numerology Chart (Lo Shu Grid)",
        "grid": grid,
        "counts": counts,
        "present": present,
        "missing": missing,
        "arrows_present": arrows_present,
        "arrows_missing": arrows_missing,
        "derivation": (
            f"Digits from {dob.isoformat()} (zeros ignored) + Mulank + Bhagyank "
            f"→ {sorted(digits)}"
        ),
    }


# --- Vedic Planetary Numerology Chart --------------------------------------- #
# Classical Chaldean/Vedic association of the digits 1-9 to the nine grahas.
# This is a *complementary* view to the Lo Shu grid — the same DOB digit
# counts, but arranged so the user sees which planetary energies dominate
# their chart at a glance.
#
# Grid layout follows the classical Vedic order used across Indian
# numerology references (also known as the "Chaldean Vedic" grid):
#   3 | 1 | 9      Guru    | Surya | Mangala
#   6 | 7 | 5      Shukra  | Ketu  | Budha
#   2 | 8 | 4      Chandra | Shani | Rahu
# Grid layout follows the classical astroleaf-style Vedic numerology grid —
# the same layout used across most Indian numerology references:
#     3 | 1 | 9      Guru    | Surya  | Mangala
#     6 | 7 | 5      Shukra  | Ketu   | Budha
#     2 | 8 | 4      Chandra | Shani  | Rahu
VEDIC_GRID_LAYOUT: tuple[tuple[int, ...], ...] = (
    (3, 1, 9),
    (6, 7, 5),
    (2, 8, 4),
)
VEDIC_PLANET_MAP: dict[int, dict[str, str]] = {
    1: {"graha": "Surya",    "english": "Sun",     "element": "Fire",   "day": "Sunday",    "color": "Deep Red",
        "essence": "Authority, vitality, leadership, willpower."},
    2: {"graha": "Chandra",  "english": "Moon",    "element": "Water",  "day": "Monday",    "color": "Silver / White",
        "essence": "Emotion, intuition, imagination, adaptability."},
    3: {"graha": "Guru",     "english": "Jupiter", "element": "Ether",  "day": "Thursday",  "color": "Yellow",
        "essence": "Wisdom, expansion, teaching, dharma."},
    4: {"graha": "Rahu",     "english": "Rahu",    "element": "Air",    "day": "Saturday",  "color": "Smoky Grey",
        "essence": "Ambition, foreign lands, sudden shifts, obsession."},
    5: {"graha": "Budha",    "english": "Mercury", "element": "Earth",  "day": "Wednesday", "color": "Green",
        "essence": "Intellect, communication, trade, wit."},
    6: {"graha": "Shukra",   "english": "Venus",   "element": "Water",  "day": "Friday",    "color": "White / Pink",
        "essence": "Love, luxury, artistry, comforts."},
    7: {"graha": "Ketu",     "english": "Ketu",    "element": "Fire",   "day": "Tuesday",   "color": "Multicolour",
        "essence": "Detachment, moksha, mysticism, past karma."},
    8: {"graha": "Shani",    "english": "Saturn",  "element": "Air",    "day": "Saturday",  "color": "Black / Blue",
        "essence": "Discipline, karma, endurance, delayed rewards."},
    9: {"graha": "Mangala",  "english": "Mars",    "element": "Fire",   "day": "Tuesday",   "color": "Red",
        "essence": "Courage, action, siblings, energy, aggression."},
}


def compute_vedic_planet_chart(dob: date) -> dict:
    """Vedic planetary (Chaldean) numerology chart.

    Uses the same DOB-digit multiset as the Lo Shu grid, but arranges the
    3×3 grid by *natural digit order* so each cell corresponds to a graha.
    A cell is "present" if that digit appears at least once in the DOB.

    Returns:
        {
          "grid":   [[cell, cell, cell], ...3 rows...],   # cell = { digit, count, graha, ... }
          "counts": {1..9: n},
          "dominant":  [ints, sorted by count desc, top 3 ],
          "missing":   [ints not present in DOB],
          "label":     "Vedic Planetary Numerology Chart"
        }
    """
    digits = _lo_shu_digits(dob)
    counts: dict[str, int] = {str(n): 0 for n in range(1, 10)}
    for d in digits:
        if 1 <= d <= 9:
            counts[str(d)] += 1

    grid: list[list[dict]] = []
    for row in VEDIC_GRID_LAYOUT:
        cells = []
        for n in row:
            planet = VEDIC_PLANET_MAP[n]
            cnt = counts[str(n)]
            cells.append({
                "digit":   n,
                "count":   cnt,
                "present": cnt > 0,
                "graha":   planet["graha"],
                "english": planet["english"],
                "element": planet["element"],
                "day":     planet["day"],
                "color":   planet["color"],
                "essence": planet["essence"],
            })
        grid.append(cells)

    # Dominant grahas — top 3 by count (excluding 0-count entries).
    dominant = sorted(
        (n for n in range(1, 10) if counts[str(n)] > 0),
        key=lambda n: (-counts[str(n)], n),
    )[:3]
    missing = [n for n in range(1, 10) if counts[str(n)] == 0]

    return {
        "label":    "Vedic Planetary Numerology Chart",
        "grid":     grid,
        "counts":   counts,
        "dominant": dominant,
        "missing":  missing,
    }


def compute_numerology(dob: date, full_name: str) -> dict:
    """Full Vedic numerology profile — three core numbers + Lo Shu grid +
    Vedic planetary chart."""
    mulank = compute_mulank(dob)
    bhagyank = compute_bhagyank(dob)
    naamank_raw, naamank = compute_naamank(full_name)

    return {
        "input": {
            "full_name": full_name,
            "date_of_birth": dob.isoformat(),
        },
        "mulank": {
            "number": mulank,
            "label": "Mulank (Root Number)",
            "derivation": f"Day of birth: {dob.day} → {mulank}",
            **NUMBER_PROFILE[mulank],
        },
        "bhagyank": {
            "number": bhagyank,
            "label": "Bhagyank (Destiny Number)",
            "derivation": (
                f"All digits of {dob.isoformat()} = "
                f"{'+'.join(c for c in f'{dob.year}{dob.month:02d}{dob.day:02d}')}"
                f" = {sum(int(d) for d in f'{dob.year}{dob.month:02d}{dob.day:02d}')}"
                f" → {bhagyank}"
            ),
            **NUMBER_PROFILE[bhagyank],
        },
        "naamank": {
            "number": naamank,
            "label": "Naamank (Name Number)",
            "derivation": (
                f"Chaldean total of '{full_name}' = {naamank_raw} → {naamank}"
                if naamank_raw > 0 else
                "Provide a name to compute Naamank."
            ),
            **(NUMBER_PROFILE[naamank] if naamank else {}),
        },
        "lo_shu":       compute_lo_shu_grid(dob),
        "vedic_chart":  compute_vedic_planet_chart(dob),
    }
