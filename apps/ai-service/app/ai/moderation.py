"""Child-safety layer.

Runs on the way in and on the way out. Deliberately fail-closed: if a check
cannot be completed the content is blocked, because the cost of a false
positive here (a child is asked to rephrase) is far lower than a false
negative.

This is a deterministic first line, not the whole story — a provider-side
moderation endpoint should sit behind it in production. It is written so a
blocked message always produces a kind, useful reply rather than a refusal a
child would find frightening.
"""
from __future__ import annotations

import re

from app.models.schemas import ModerationResult

# Patterns are word-boundary anchored so ordinary school words are not caught:
# "class" must not trip on "ass", "grape" must not trip on "rape".
_BLOCKLIST: dict[str, list[str]] = {
    "self_harm": [
        r"\bkill (myself|me)\b", r"\bsuicide\b", r"\bhurt myself\b",
        r"\bcut myself\b", r"\bend my life\b",
    ],
    "violence": [
        r"\bhow (to|do i) (make|build) a (bomb|weapon|gun)\b",
        r"\bhurt (someone|somebody|him|her|them)\b", r"\bkill (someone|somebody)\b",
    ],
    "sexual": [r"\bsex\b", r"\bporn\b", r"\bnude\b", r"\bnaked\b"],
    "illegal": [r"\bbuy drugs\b", r"\bhow to steal\b", r"\bhack (into|someone)\b"],
    "danger": [r"\bdrink bleach\b", r"\bswallow\b.{0,20}\b(battery|poison)\b"],
}

# Things a children's product must never solicit, even innocently.
_PII_REQUESTS = [
    r"\b(what is|tell me) your (address|password|phone)\b",
    r"\bwhere do you live\b",
    r"\byour (home )?address\b",
    r"\bcredit card\b",
]

_SAFE_REPLIES = {
    "self_harm": (
        "That sounds really heavy, and I'm not the right one to help with it. "
        "Please talk to a parent, a teacher, or another adult you trust right now — "
        "they will want to help you."
    ),
    "violence": "I can't help with that. Shall we go back to your lesson instead?",
    "sexual": "That isn't something I can talk about. Let's get back to learning — what are you working on?",
    "illegal": "I can't help with that one. Want to try a practice question instead?",
    "danger": (
        "That isn't safe, so I can't help with it. If you're worried about something, "
        "please tell a parent or teacher."
    ),
    "pii": (
        "I don't ask for or share personal details like addresses or passwords — and you "
        "shouldn't share them online either. Let's keep going with your lesson."
    ),
}

_DEFAULT_SAFE = "Let's keep to schoolwork. What would you like help with?"


def _match(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


def check_input(text: str) -> ModerationResult:
    """Screen what the child typed before it reaches the model."""
    if not text or not text.strip():
        return ModerationResult(allowed=False, category="empty", reason="Empty message",
                                safe_reply="Ask me anything about your lesson!")

    for category, patterns in _BLOCKLIST.items():
        if _match(text, patterns):
            return ModerationResult(
                allowed=False, category=category, reason=f"Matched {category} pattern",
                safe_reply=_SAFE_REPLIES.get(category, _DEFAULT_SAFE),
            )

    return ModerationResult(allowed=True)


def check_output(text: str) -> ModerationResult:
    """Screen what the model produced before it reaches the child.

    Also catches the model soliciting personal information, which a child would
    have no reason to distrust.
    """
    for category, patterns in _BLOCKLIST.items():
        if _match(text, patterns):
            return ModerationResult(
                allowed=False, category=category, reason=f"Model output matched {category}",
                safe_reply=_DEFAULT_SAFE,
            )

    if _match(text, _PII_REQUESTS):
        return ModerationResult(allowed=False, category="pii",
                                reason="Model solicited personal information",
                                safe_reply=_SAFE_REPLIES["pii"])

    # A tutor must never tell a child to keep things from their adults.
    if re.search(r"\b(don'?t|do not) tell (your )?(parents?|teachers?|mum|mom|dad)\b", text, re.IGNORECASE):
        return ModerationResult(allowed=False, category="secrecy",
                                reason="Model encouraged secrecy from carers",
                                safe_reply=_DEFAULT_SAFE)

    return ModerationResult(allowed=True)
