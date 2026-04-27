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


def compute_numerology(dob: date, full_name: str) -> dict:
    """Full Vedic numerology profile."""
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
    }
