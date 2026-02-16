import os
import uuid
from datetime import datetime
from icalendar import Calendar, Event, vText
from typing import Optional


def create_calendar_invite(
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    attendees: Optional[list[str]] = None,
) -> dict:
    """
    Generate a .ics calendar invite and optionally create a Google Calendar event.

    Returns a dict with:
      - ics_content: the raw .ics file string
      - google_calendar_url: a URL to add the event via Google Calendar web UI
      - event_details: structured event info
    """
    try:
        dt_start = datetime.fromisoformat(start_time)
        dt_end = datetime.fromisoformat(end_time)
    except ValueError:
        dt_start = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        dt_end = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)

    cal = Calendar()
    cal.add("prodid", "-//Meeting Agent//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")

    event = Event()
    event.add("summary", title)
    event.add("dtstart", dt_start)
    event.add("dtend", dt_end)
    event.add("description", description)
    event.add("uid", str(uuid.uuid4()))
    event.add("dtstamp", datetime.now())

    if attendees:
        for attendee in attendees:
            if "@" in attendee:
                event.add("attendee", f"mailto:{attendee}")
            else:
                event["attendee"] = vText(attendee)

    cal.add_component(event)
    ics_content = cal.to_ical().decode("utf-8")

    google_url = _build_google_calendar_url(title, description, dt_start, dt_end)

    return {
        "type": "calendar_invite",
        "ics_content": ics_content,
        "google_calendar_url": google_url,
        "event_details": {
            "title": title,
            "description": description,
            "start_time": dt_start.isoformat(),
            "end_time": dt_end.isoformat(),
            "attendees": attendees or [],
        },
    }


def _build_google_calendar_url(
    title: str,
    description: str,
    start: datetime,
    end: datetime,
) -> str:
    """Build a Google Calendar 'Add Event' URL (no API key needed)."""
    from urllib.parse import quote

    fmt = "%Y%m%dT%H%M%S"
    dates = f"{start.strftime(fmt)}/{end.strftime(fmt)}"
    base = "https://calendar.google.com/calendar/render"
    params = f"?action=TEMPLATE&text={quote(title)}&dates={dates}&details={quote(description)}"
    return base + params
