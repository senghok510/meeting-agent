from tools.calendar_invite import create_calendar_invite
from tools.decision_record import create_decision_record
from tools.report import create_report

TOOL_REGISTRY = {
    "create_calendar_invite": create_calendar_invite,
    "create_decision_record": create_decision_record,
    "create_report": create_report,
}
