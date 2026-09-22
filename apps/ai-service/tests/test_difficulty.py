from app.ml.difficulty_model import difficulty_for_mastery, next_difficulty


def test_bands_follow_the_spec_thresholds() -> None:
    assert difficulty_for_mastery(0.10) == 1
    assert difficulty_for_mastery(0.50) == 2
    assert difficulty_for_mastery(0.70) == 3
    assert difficulty_for_mastery(0.85) == 4
    assert difficulty_for_mastery(0.95) == 5


def test_mastery_is_clamped() -> None:
    assert difficulty_for_mastery(-1.0) == 1
    assert difficulty_for_mastery(2.0) == 5


def test_difficulty_moves_at_most_one_step() -> None:
    # A child at high mastery who slips should not be dropped to beginner.
    assert next_difficulty(5, correct=False, mastery=0.10) == 4
    # Nor jumped multiple levels for one correct answer.
    assert next_difficulty(1, correct=True, mastery=0.99) == 2


def test_no_change_when_already_in_band() -> None:
    assert next_difficulty(3, correct=True, mastery=0.70) == 3
