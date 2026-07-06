"""Rider-Waite Minor Arcana — 4 suits x 14 ranks = 56 cards.

Kept as a separate module so tarot.py stays readable.

Suit associations (classical):
  * Wands      — Fire   — action, passion, willpower, creativity, spirit
  * Cups       — Water  — emotion, relationships, intuition, healing
  * Swords     — Air    — thought, communication, conflict, truth
  * Pentacles  — Earth  — money, career, body, tangible outcomes

Meanings are traditional Rider-Waite — concise, well-known summaries.
"""
from __future__ import annotations


def _build_minor_arcana() -> list[dict]:
    ranks = [
        ("Ace",   1),  ("Two",    2), ("Three", 3),  ("Four",  4),  ("Five",  5),
        ("Six",   6),  ("Seven",  7), ("Eight", 8),  ("Nine",  9),  ("Ten",  10),
        ("Page", 11),  ("Knight",12), ("Queen",13),  ("King", 14),
    ]

    # per-suit narrative themes — used to give each card a suit-flavoured
    # meaning even when the mechanical rank is the same.
    themes = {
        "Wands":     "action, drive & creative spark",
        "Cups":      "emotion, love & intuition",
        "Swords":    "thought, conflict & clarity",
        "Pentacles": "work, wealth & the body",
    }

    # Base rank meanings — layered with suit flavour when we assemble the deck.
    base_meanings = {
        "Ace":   ("A fresh burst of {theme}; a doorway opens.",              "Delay or false start; the seed hasn't taken root yet."),
        "Two":   ("A choice or partnership around {theme}; balance sought.", "Imbalance, indecision, difficulty choosing."),
        "Three": ("Early growth and collaboration in {theme}.",              "Setback, missed cooperation, wasted effort."),
        "Four":  ("Stability & rest inside {theme}.",                        "Restlessness, insecurity, resistance to rest."),
        "Five":  ("Conflict, loss or challenge testing your {theme}.",       "Recovery, reconciliation, moving past the hardship."),
        "Six":   ("Harmony returns; success and generosity in {theme}.",     "Selfishness, uneven exchanges, unearned praise."),
        "Seven": ("Assessment & standing your ground in {theme}.",           "Giving up, distraction, dishonest tactics."),
        "Eight": ("Rapid movement or mastery in {theme}.",                   "Delays, burnout, energy scattered."),
        "Nine":  ("Resilience: nearly-complete work in {theme}.",            "Defensiveness, paranoia, refusal to open up."),
        "Ten":   ("Completion & culmination of a {theme} cycle.",            "Burden, exhaustion, an ending overstayed."),
        "Page":  ("A curious student energy exploring {theme}.",             "Immaturity, gossip, procrastination."),
        "Knight":("Bold, focused pursuit of {theme}.",                       "Recklessness, impatience, wasted energy."),
        "Queen": ("Warm mastery — nurturing {theme} with grace.",            "Coldness, control, emotional withdrawal."),
        "King":  ("Full command of {theme} — wise, established authority.",  "Rigidity, tyranny, misuse of power."),
    }

    # Suit-specific overrides for the most iconic Rider-Waite scenes — we
    # don't want the Three of Swords or the Ten of Cups to read generically.
    overrides = {
        ("Three", "Swords"):  ("Heartbreak, betrayal or painful truth — the wound is real, and it is teacher.",
                               "Healing begins; releasing an old sorrow, forgiving what was."),
        ("Ten",  "Cups"):     ("Emotional fulfilment — family joy, harmonious home, a rainbow after rain.",
                               "Broken family harmony, disconnected loved ones, unmet dreams of togetherness."),
        ("Ten",  "Swords"):   ("A painful ending — rock bottom reached; from here only the dawn can rise.",
                               "Slow recovery, resisting the ending, avoiding the necessary end."),
        ("Ten",  "Pentacles"):("Generational wealth, legacy, lasting family prosperity.",
                               "Family conflict, financial insecurity, a legacy at risk."),
        ("Five", "Cups"):     ("Grief for what was lost — but three cups still stand upright behind you.",
                               "Acceptance, moving forward, learning from loss."),
        ("Five", "Pentacles"):("Hardship, feeling excluded — help is nearer than you think.",
                               "Recovery from hard times, spiritual renewal, help accepted."),
        ("Six", "Swords"):    ("A quiet crossing — leaving trouble behind for calmer waters.",
                               "Stuck in transit, unable to leave the past, resistance to help."),
        ("Nine", "Cups"):     ("The wish card — contentment, satisfaction, indulgence in what you love.",
                               "Smugness, unfulfilled wish, overindulgence."),
        ("Nine", "Swords"):   ("Anxiety, sleepless nights, worries feel bigger than reality warrants.",
                               "Anxiety releases; the mind releases fears that were only shadows."),
        ("Eight", "Swords"):  ("Feeling trapped by your own thinking — but the blindfold can be removed.",
                               "Freedom claimed, new perspective, escape from mental prison."),
        ("Seven", "Cups"):    ("Many tempting options — some are illusion, one is the true call.",
                               "Focus returns, seeing through fantasy, making the real choice."),
        ("Four", "Cups"):     ("Discontent, tuning out an offer that could shift everything.",
                               "Awareness returns, opening to what's being offered."),
        ("Two",  "Cups"):     ("A soul connection — mutual love, partnership, a heart-meeting.",
                               "Disharmony in a bond, misalignment, unrequited feeling."),
        ("Two",  "Swords"):   ("A stalemate — blindfolded to the choice you must eventually make.",
                               "The blindfold lifts, the truth surfaces, decision made."),
    }

    deck = []
    n = 22
    for suit, theme in themes.items():
        for rank, rank_num in ranks:
            key = (rank, suit)
            if key in overrides:
                up, rev = overrides[key]
            else:
                up_tpl, rev_tpl = base_meanings[rank]
                up  = up_tpl.format(theme=theme)
                rev = rev_tpl
            deck.append({
                "number":   n,
                "arcana":   "minor",
                "suit":     suit,
                "rank":     rank,
                "rank_num": rank_num,
                "name":     f"{rank} of {suit}",
                "keywords": [suit.lower(), theme.split(",")[0].strip()],
                "upright":  up,
                "reversed": rev,
            })
            n += 1
    return deck


MINOR_ARCANA: list[dict] = _build_minor_arcana()
