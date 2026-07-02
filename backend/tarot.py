"""Tarot deck (22 Major Arcana) + card-drawing logic.

Kept intentionally simple: single 3-card Past · Present · Future spread.
Each drawn card is either upright or reversed with equal probability.
"""
from __future__ import annotations

import random
from typing import Literal

CardOrientation = Literal["upright", "reversed"]


# Classical Rider-Waite Major Arcana with concise, well-known meanings.
MAJOR_ARCANA: list[dict] = [
    {"number": 0,  "name": "The Fool",             "keywords": ["new beginnings", "innocence", "leap of faith"],       "upright": "New adventures, spontaneity, unlimited potential and a fresh start.",           "reversed": "Recklessness, poor timing, foolishness, a lack of planning."},
    {"number": 1,  "name": "The Magician",         "keywords": ["manifestation", "skill", "willpower"],                "upright": "You have all the tools you need — focused will can turn ideas into reality.",  "reversed": "Manipulation, misused talent, self-deception, unfulfilled promise."},
    {"number": 2,  "name": "The High Priestess",   "keywords": ["intuition", "subconscious", "mystery"],               "upright": "Trust your inner voice; wisdom is arriving through dreams and quiet knowing.",  "reversed": "Secrets kept from yourself, ignored intuition, disconnect from inner truth."},
    {"number": 3,  "name": "The Empress",          "keywords": ["abundance", "nurturing", "creativity"],               "upright": "A season of fertility, artistic flow, mothering energy and material comfort.",  "reversed": "Creative block, dependence, neglecting self-care, smothering others."},
    {"number": 4,  "name": "The Emperor",          "keywords": ["authority", "structure", "leadership"],               "upright": "Discipline, boundaries and paternal guidance build lasting foundations.",       "reversed": "Rigidity, domineering behaviour, loss of control, weakened authority."},
    {"number": 5,  "name": "The Hierophant",       "keywords": ["tradition", "teaching", "convention"],                "upright": "Guidance from a teacher, tradition or spiritual institution supports growth.",  "reversed": "Rebellion against tradition, unconventional path, personal beliefs redefined."},
    {"number": 6,  "name": "The Lovers",           "keywords": ["union", "choice", "values"],                          "upright": "A deep alignment of values; a partnership or choice made with the whole heart.", "reversed": "Disharmony, misalignment, an important choice avoided or made from fear."},
    {"number": 7,  "name": "The Chariot",          "keywords": ["willpower", "victory", "determination"],              "upright": "Focused effort and self-mastery drive you toward a well-earned victory.",       "reversed": "Loss of direction, scattered energy, aggression, failure to hold the reins."},
    {"number": 8,  "name": "Strength",             "keywords": ["courage", "compassion", "inner strength"],            "upright": "Gentle, patient force wins — courage rooted in love masters the wild within.",  "reversed": "Self-doubt, insecurity, misused strength, letting fear rule."},
    {"number": 9,  "name": "The Hermit",           "keywords": ["solitude", "inner guidance", "reflection"],           "upright": "Withdraw to hear your own light; wisdom is found in silence and study.",         "reversed": "Isolation, loneliness, refusal to seek advice, spiritual dry spell."},
    {"number": 10, "name": "Wheel of Fortune",     "keywords": ["cycles", "destiny", "turning point"],                 "upright": "Fortune turns in your favour; a karmic wheel completes and a new cycle opens.",  "reversed": "Bad luck, resistance to change, external forces disrupt your plans."},
    {"number": 11, "name": "Justice",              "keywords": ["truth", "fairness", "cause & effect"],                "upright": "The truth prevails; decisions made now carry the weight of karma and reward.",  "reversed": "Unfairness, dishonesty, avoidance of accountability, imbalance."},
    {"number": 12, "name": "The Hanged Man",       "keywords": ["surrender", "new perspective", "pause"],              "upright": "Surrender the struggle; a deliberate pause reveals a wholly new perspective.",  "reversed": "Stalling, martyrdom, stagnation from refusing to let go."},
    {"number": 13, "name": "Death",                "keywords": ["endings", "transformation", "rebirth"],               "upright": "A necessary ending clears space for profound rebirth — release the old skin.",  "reversed": "Fear of change, clinging to what has died, delayed transformation."},
    {"number": 14, "name": "Temperance",           "keywords": ["balance", "moderation", "healing"],                   "upright": "Patient blending of opposites brings healing, harmony and steady progress.",   "reversed": "Excess, imbalance, impatience, ill-timed action, self-medicating."},
    {"number": 15, "name": "The Devil",            "keywords": ["attachment", "shadow", "materialism"],                "upright": "See the chains you have chosen — awareness itself is the key that frees you.", "reversed": "Breaking free, reclaiming power, releasing an addiction or toxic pattern."},
    {"number": 16, "name": "The Tower",            "keywords": ["upheaval", "revelation", "sudden change"],            "upright": "A false structure collapses in a sudden flash so authentic truth can arise.",   "reversed": "Averted disaster, resisting inevitable change, fear of transformation."},
    {"number": 17, "name": "The Star",             "keywords": ["hope", "renewal", "inspiration"],                     "upright": "After the storm — hope returns; healing waters restore faith and inspiration.", "reversed": "Discouragement, faithlessness, disconnect from purpose or the divine."},
    {"number": 18, "name": "The Moon",             "keywords": ["illusion", "intuition", "hidden fears"],              "upright": "Cross unclear waters by your intuition alone; dreams reveal what light hides.", "reversed": "Confusion clearing, truth surfacing, releasing fear and delusion."},
    {"number": 19, "name": "The Sun",              "keywords": ["success", "joy", "vitality"],                         "upright": "Radiant success, joy and clarity — everything comes into full-hearted light.",  "reversed": "Temporary setbacks, dimmed enthusiasm, over-confidence, delayed success."},
    {"number": 20, "name": "Judgement",            "keywords": ["awakening", "reckoning", "rebirth"],                  "upright": "A spiritual awakening or life-review; you are called to rise into your truth.", "reversed": "Self-doubt, denial of a calling, harsh inner critic, avoiding growth."},
    {"number": 21, "name": "The World",            "keywords": ["completion", "wholeness", "fulfilment"],              "upright": "A major cycle completes with fulfilment; you stand whole at the finish line.",  "reversed": "Unfinished business, delayed closure, loose ends preventing completion."},
]

POSITION_MEANINGS = {
    "past":    "Foundations & influences shaping the current moment.",
    "present": "The heart of the situation right now — the energy at play today.",
    "future":  "The direction things are heading if the current trajectory continues.",
}


def draw_three_card_spread(seed: int | None = None) -> list[dict]:
    """Draw 3 unique cards, each independently upright or reversed.

    Returns a list of 3 dicts in fixed positional order (past → present → future),
    each containing the card details, orientation, its meaning in that orientation
    and the position's meaning.
    """
    rng = random.Random(seed)
    drawn = rng.sample(MAJOR_ARCANA, 3)
    positions = ("past", "present", "future")

    spread = []
    for pos, card in zip(positions, drawn):
        orientation: CardOrientation = rng.choice(("upright", "reversed"))
        spread.append({
            "position": pos,
            "position_meaning": POSITION_MEANINGS[pos],
            "number":    card["number"],
            "name":      card["name"],
            "orientation": orientation,
            "keywords":  card["keywords"],
            "meaning":   card[orientation],
        })
    return spread
