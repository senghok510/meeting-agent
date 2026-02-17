from typing import Optional


def analyze_sentiment(
    overall_tone: str,
    tone_details: str,
    conflict_detected: bool = False,
    conflict_details: Optional[str] = None,
    key_emotions: Optional[list[str]] = None,
    productivity_score: Optional[int] = None,
) -> dict:
    """
    Analyze the sentiment and tone of a meeting.

    Parameters:
      - overall_tone: e.g. "productive", "tense", "casual", "mixed"
      - tone_details: a brief explanation of the tone
      - conflict_detected: whether any tension or disagreement was noted
      - conflict_details: description of the conflict if detected
      - key_emotions: list of emotions observed (e.g. "enthusiasm", "frustration")
      - productivity_score: 1-10 rating of how productive the meeting was

    Returns a dict with:
      - type: "sentiment"
      - tone: the overall tone label
      - badge: a short badge string for UI display
      - details: full analysis
    """
    emotions = key_emotions or []
    score = min(max(productivity_score or 5, 1), 10)

    tone_badges = {
        "productive": ("Productive", "green"),
        "tense": ("Tension Detected", "red"),
        "casual": ("Casual", "blue"),
        "mixed": ("Mixed Tone", "yellow"),
        "positive": ("Positive", "green"),
        "negative": ("Negative", "red"),
        "neutral": ("Neutral", "gray"),
    }

    badge_text, badge_color = tone_badges.get(
        overall_tone.lower(), (overall_tone.capitalize(), "gray")
    )

    if conflict_detected and badge_color != "red":
        badge_text += " + Conflict"
        badge_color = "yellow"

    return {
        "type": "sentiment",
        "tone": overall_tone,
        "badge": badge_text,
        "badge_color": badge_color,
        "conflict_detected": conflict_detected,
        "details": {
            "overall_tone": overall_tone,
            "tone_details": tone_details,
            "conflict_detected": conflict_detected,
            "conflict_details": conflict_details or "",
            "key_emotions": emotions,
            "productivity_score": score,
        },
    }
