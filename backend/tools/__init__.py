from tools.calendar_invite import create_calendar_invite
from tools.decision_record import create_decision_record
from tools.report import create_report
from tools.email_summary import create_email_summary
from tools.action_items import create_action_items
from tools.sentiment import analyze_sentiment

TOOL_REGISTRY = {
    "create_calendar_invite": create_calendar_invite,
    "create_decision_record": create_decision_record,
    "create_report": create_report,
    "create_email_summary": create_email_summary,
    "create_action_items": create_action_items,
    "analyze_sentiment": analyze_sentiment,
}
