from datetime import datetime
from typing import Optional


def create_email_summary(
    subject: str,
    body: str,
    attendees: Optional[list[str]] = None,
    date: Optional[str] = None,
) -> dict:
    """
    Generate a ready-to-send email summary of a meeting.

    Returns a dict with:
      - type: "email_summary"
      - subject: email subject line
      - body_plain: plain text version
      - body_html: HTML formatted version
      - metadata: structured email info
    """
    email_date = date or datetime.now().strftime("%Y-%m-%d")
    recipient_list = attendees or []

    recipients_str = ", ".join(recipient_list) if recipient_list else "Team"

    body_plain = f"""Hi {recipients_str},

Here is the summary from our meeting on {email_date}:

{body}

Best regards,
Meeting Agent
"""

    body_html = f"""<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Hi {recipients_str},</p>
  <p>Here is the summary from our meeting on <strong>{email_date}</strong>:</p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
  <div style="white-space: pre-wrap; line-height: 1.6;">{body}</div>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
  <p style="color: #888; font-size: 12px;">Best regards,<br/>Meeting Agent</p>
</div>"""

    return {
        "type": "email_summary",
        "subject": subject,
        "body_plain": body_plain,
        "body_html": body_html,
        "metadata": {
            "subject": subject,
            "date": email_date,
            "attendees": recipient_list,
            "body": body,
        },
    }
