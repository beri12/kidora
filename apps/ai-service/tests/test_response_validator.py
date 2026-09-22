from app.ai.response_validator import extract_json, parse_tutor_response, safe_fallback


def test_parses_clean_json() -> None:
    r = parse_tutor_response('{"message": "Hello", "difficulty": 3}')
    assert r and r.message == "Hello" and r.difficulty == 3


def test_parses_json_wrapped_in_prose_or_fences() -> None:
    r = parse_tutor_response('Sure!\n```json\n{"message": "Hi there"}\n```')
    assert r and r.message == "Hi there"


def test_plain_prose_is_still_usable() -> None:
    r = parse_tutor_response("A fraction is part of a whole.")
    assert r and "fraction" in r.message


def test_empty_output_returns_none_so_the_caller_can_retry() -> None:
    assert parse_tutor_response("") is None


def test_invalid_shape_returns_none_rather_than_guessing() -> None:
    # difficulty out of range must not be silently coerced.
    assert parse_tutor_response('{"message": "x", "difficulty": 99}') is None


def test_fallback_is_honest_and_flagged() -> None:
    fb = safe_fallback()
    assert fb.degraded is True
    assert fb.recommended_next_step == "ask_teacher"


def test_extract_json_handles_garbage() -> None:
    assert extract_json("not json at all") is None
