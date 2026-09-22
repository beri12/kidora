"""Adaptive difficulty.

Phase 1 is the rule half of the rule+ML hybrid the spec describes: a
monotonic mapping from mastery to a 1-5 band, with hysteresis so a single
wrong answer cannot swing a child from challenge back to beginner. The ML half
replaces `difficulty_for_mastery` once there are enough learning events to
train on; the interface stays the same.
"""
from __future__ import annotations

# Upper bound of each band, from the spec's thresholds.
_BANDS: list[tuple[float, int]] = [
    (0.35, 1),  # beginner
    (0.60, 2),  # basic
    (0.80, 3),  # intermediate
    (0.92, 4),  # advanced
    (1.01, 5),  # challenge
]


def difficulty_for_mastery(mastery: float) -> int:
    """Map a mastery probability to a difficulty band."""
    m = min(max(mastery, 0.0), 1.0)
    for upper, level in _BANDS:
        if m < upper:
            return level
    return 5


def next_difficulty(current: int, *, correct: bool, mastery: float) -> int:
    """Adjust by at most one step at a time.

    Deliberately gentle: for a child, being dropped two levels after one slip
    is discouraging, and being jumped two levels is demoralising.
    """
    target = difficulty_for_mastery(mastery)
    if correct and target > current:
        return min(current + 1, 5)
    if not correct and target < current:
        return max(current - 1, 1)
    return current
