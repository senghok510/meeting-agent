import json
import os
from typing import Generator
from openai import OpenAI
from dotenv import load_dotenv
from tools import TOOL_REGISTRY

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", ""),
)

MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")

SYSTEM_PROMPT = """You are a Meeting AI Agent. You analyze meeting transcripts and produce structured outputs.

Based on the content of the transcript, decide which tool(s) to call:

1. **create_calendar_invite** — Use when the transcript mentions a scheduled follow-up meeting, 
   a deadline, or any event with a specific date/time. Extract the event details.

2. **create_decision_record** — Use when the transcript contains a clear decision that was made 
   during the meeting. Document the context, the decision itself, and its consequences.

3. **create_report** — Use when the transcript is a general meeting discussion. Summarize it 
   into a structured report with key points and action items.

You may call MULTIPLE tools if appropriate. For example, a meeting might warrant both a report 
AND a calendar invite for a follow-up.

Always extract as much relevant detail from the transcript as possible. Use ISO 8601 format for 
dates/times (e.g. 2026-02-20T14:00:00). If a date/time is not explicitly stated, make a 
reasonable inference or use "TBD".

After all tool calls are done, provide a brief summary of what you produced."""

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "create_calendar_invite",
            "description": "Create a calendar invite (.ics file) for a scheduled event mentioned in the meeting",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title of the calendar event",
                    },
                    "description": {
                        "type": "string",
                        "description": "Description/agenda for the event",
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Start time in ISO 8601 format (e.g. 2026-02-20T14:00:00)",
                    },
                    "end_time": {
                        "type": "string",
                        "description": "End time in ISO 8601 format (e.g. 2026-02-20T15:00:00)",
                    },
                    "attendees": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of attendee names or emails",
                    },
                },
                "required": ["title", "start_time", "end_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_decision_record",
            "description": "Create a structured decision record (ADR) for a decision made during the meeting",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title of the decision",
                    },
                    "context": {
                        "type": "string",
                        "description": "Background context that led to this decision",
                    },
                    "decision": {
                        "type": "string",
                        "description": "The decision that was made",
                    },
                    "consequences": {
                        "type": "string",
                        "description": "Expected consequences and impact of this decision",
                    },
                    "participants": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "People involved in making this decision",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of the decision in ISO 8601 format",
                    },
                },
                "required": ["title", "context", "decision"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_report",
            "description": "Create a structured meeting report/summary",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Title of the meeting report",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Executive summary of the meeting",
                    },
                    "key_points": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of key discussion points",
                    },
                    "action_items": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of action items with owners if known",
                    },
                    "attendees": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of meeting attendees",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of the meeting",
                    },
                },
                "required": ["title", "summary", "key_points", "action_items"],
            },
        },
    },
]


TOOL_TAGS = {
    "create_calendar_invite": "calendar",
    "create_decision_record": "decision",
    "create_report": "report",
}

SEPARATOR = "═" * 60

# ANSI color codes
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"
C_RED = "\033[31m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_BLUE = "\033[34m"
C_MAGENTA = "\033[35m"
C_CYAN = "\033[36m"


def _truncate(s: str, max_len: int = 200) -> str:
    """Truncate a string for readable terminal output."""
    if len(s) <= max_len:
        return s
    return s[:max_len] + "..."


def _print_phase(title: str) -> None:
    """Print a phase header."""
    print(f"\n{C_CYAN}{SEPARATOR}{C_RESET}")
    print(f"  {C_CYAN}{C_BOLD}{title}{C_RESET}")
    print(f"{C_CYAN}{SEPARATOR}{C_RESET}")


def execute_tool(tool_name: str, arguments: dict) -> dict:
    """Execute a tool by name with the given arguments."""
    func = TOOL_REGISTRY.get(tool_name)
    if func is None:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        return func(**arguments)
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}


def run_agent(transcript: str) -> Generator[dict, None, None]:
    """
    Run the agent loop. Yields SSE events as dicts:
      {"type": "thinking", "content": "..."}
      {"type": "tool_call", "tool": "...", "arguments": {...}}
      {"type": "tool_result", "tool": "...", "result": {...}}
      {"type": "final", "content": "..."}
      {"type": "error", "content": "..."}
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Please analyze this meeting transcript:\n\n{transcript}"},
    ]

    iteration = 0
    max_iterations = 5
    for _ in range(max_iterations):
        iteration += 1

        # --- PHASE 1 / 3: LLM Request ---
        if iteration == 1:
            _print_phase("PHASE 1: LLM Request")
        else:
            _print_phase("PHASE 3: Summary Generation")

        request_payload = {
            "model": MODEL,
            "messages": messages,
            "tools": TOOLS_SCHEMA,
            "tool_choice": "auto",
        }

        if iteration == 1:
            print(f"\n{C_BLUE}📨 Sending request to LLM...{C_RESET}")
        else:
            print(f"\n{C_BLUE}📨 Sending follow-up to LLM...{C_RESET}")
        print(f"{C_DIM}{json.dumps(request_payload, indent=2, default=str)}{C_RESET}")

        print(f"\n{C_BLUE}{C_BOLD}❇  Calling LLM...{C_RESET}")

        try:
            yield {"type": "thinking", "content": "Analyzing transcript..."}

            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOLS_SCHEMA,
                tool_choice="auto",
            )
        except Exception as e:
            print(f"\n{C_RED}{C_BOLD}❌ LLM API error: {e}{C_RESET}")
            yield {"type": "error", "content": f"LLM API error: {str(e)}"}
            return

        choice = response.choices[0]
        message = choice.message

        if message.tool_calls:
            # --- Log LLM response with tool selections ---
            print(f"\n{C_MAGENTA}{C_BOLD}🤖 LLM RESPONSE:{C_RESET}")
            print(f"{C_YELLOW}Tool calls selected: {len(message.tool_calls)}{C_RESET}")

            for tc in message.tool_calls:
                args_str = _truncate(tc.function.arguments)
                print(f"\n  • Tool: {C_BOLD}{tc.function.name}{C_RESET}")
                print(f"    {C_DIM}Arguments: {args_str}{C_RESET}")

            tool_names = [tc.function.name for tc in message.tool_calls]
            print(f"\n{C_GREEN}✓ LLM selected {len(tool_names)} tool(s){C_RESET}")
            for name in tool_names:
                print(f"  {C_GREEN}• {name}{C_RESET}")

            # --- PHASE 2: Tool Execution ---
            _print_phase(f"PHASE 2: Tool Execution ({len(message.tool_calls)} tool(s))")

            messages.append(message.model_dump())

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tag = TOOL_TAGS.get(tool_name, tool_name)
                try:
                    arguments = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    arguments = {}

                print(f"\n{C_CYAN}[{tag}]{C_RESET} Executing {tool_name}...")

                yield {
                    "type": "tool_call",
                    "tool": tool_name,
                    "arguments": arguments,
                }

                result = execute_tool(tool_name, arguments)

                if "error" in result:
                    print(f"{C_CYAN}[{tag}]{C_RESET} {C_RED}✗ {tool_name}: {result['error']}{C_RESET}")
                else:
                    print(f"{C_CYAN}[{tag}]{C_RESET} {C_GREEN}✓ {tool_name}: success{C_RESET}")

                yield {
                    "type": "tool_result",
                    "tool": tool_name,
                    "result": result,
                }

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result),
                    }
                )
        else:
            # --- Final text response ---
            final_content = message.content or "Analysis complete."
            print(f"\n{C_MAGENTA}{C_BOLD}📝 Final summary:{C_RESET}")
            print(final_content)
            print(f"\n{C_GREEN}{C_BOLD}✅ Agent complete.{C_RESET}")

            yield {
                "type": "final",
                "content": final_content,
            }
            return

    print(f"\n{C_GREEN}{C_BOLD}✅ Agent complete (max iterations reached).{C_RESET}")
    yield {"type": "final", "content": "Agent finished (max iterations reached)."}
