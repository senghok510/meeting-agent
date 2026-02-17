from datetime import datetime
from typing import Optional


def create_action_items(
    items: list[dict],
    meeting_title: Optional[str] = None,
    date: Optional[str] = None,
) -> dict:
    """
    Create a structured list of action items from a meeting.

    Each item in `items` should have:
      - task: description of the action item
      - assignee: person responsible (or "Unassigned")
      - deadline: when it's due (or "TBD")
      - priority: "high", "medium", or "low"

    Returns a dict with:
      - type: "action_items"
      - items: structured list of action items
      - markdown: formatted markdown output
      - csv: CSV-format string for download
      - metadata: extra info
    """
    action_date = date or datetime.now().strftime("%Y-%m-%d")
    title = meeting_title or "Meeting"

    normalized: list[dict] = []
    for item in items:
        normalized.append({
            "task": item.get("task", ""),
            "assignee": item.get("assignee", "Unassigned"),
            "deadline": item.get("deadline", "TBD"),
            "priority": item.get("priority", "medium"),
        })

    priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}

    md_rows = []
    for i, item in enumerate(normalized, 1):
        emoji = priority_emoji.get(item["priority"], "⚪")
        md_rows.append(
            f"| {i} | {emoji} {item['priority'].capitalize()} | {item['task']} | {item['assignee']} | {item['deadline']} |"
        )

    markdown = f"""# Action Items: {title}

**Date:** {action_date}
**Total Items:** {len(normalized)}

| # | Priority | Task | Assignee | Deadline |
|---|----------|------|----------|----------|
{chr(10).join(md_rows)}

---

*Action items extracted by Meeting Agent.*
"""

    csv_lines = ["#,Priority,Task,Assignee,Deadline"]
    for i, item in enumerate(normalized, 1):
        task_escaped = item["task"].replace('"', '""')
        csv_lines.append(
            f'{i},{item["priority"]},"{task_escaped}",{item["assignee"]},{item["deadline"]}'
        )

    return {
        "type": "action_items",
        "items": normalized,
        "markdown": markdown,
        "csv": "\n".join(csv_lines),
        "metadata": {
            "meeting_title": title,
            "date": action_date,
            "total_items": len(normalized),
        },
    }
