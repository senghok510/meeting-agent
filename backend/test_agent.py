"""
Quick smoke test — run from the backend/ directory:
  uv run python test_agent.py

Requires OPENROUTER_API_KEY in .env
"""

from agent import run_agent

SAMPLE_TRANSCRIPT = """
Sarah: Good morning everyone. Let's get started with the weekly standup.

John: I've been working on the new authentication module. I think we should switch 
from session-based auth to JWT tokens. It will scale better with our microservices.

Sarah: That's a big change. What are the trade-offs?

John: JWTs are stateless so we don't need a session store, but we lose the ability 
to invalidate tokens server-side easily. We can mitigate that with short expiry times 
and refresh tokens.

Sarah: I think that makes sense given our architecture direction. Let's go with JWT.
Maria, can you document this decision?

Maria: Sure. Also, we need to schedule a follow-up meeting to review the implementation 
plan. How about next Thursday at 3pm?

Sarah: Thursday at 3pm works for me. Let's plan for one hour.

John: Works for me too. I'll have a draft implementation ready by then.

Sarah: Great. Let's also make sure we capture the action items from today.
John — draft the JWT implementation. Maria — update the auth documentation.
I'll review our current session management code for migration points.
"""

print("=" * 60)
print("Running Meeting Agent on sample transcript...")
print("=" * 60)

for event in run_agent(SAMPLE_TRANSCRIPT):
    etype = event["type"]
    if etype == "thinking":
        print(f"\n[Thinking] {event['content']}")
    elif etype == "tool_call":
        print(f"\n[Tool Call] {event['tool']}({list(event['arguments'].keys())})")
    elif etype == "tool_result":
        result = event["result"]
        print(f"[Tool Result] type={result.get('type', 'unknown')}")
        if "markdown" in result:
            print(result["markdown"][:200] + "...")
        elif "event_details" in result:
            print(f"  Event: {result['event_details']}")
    elif etype == "final":
        print(f"\n[Final] {event['content']}")
    elif etype == "error":
        print(f"\n[ERROR] {event['content']}")

print("\n" + "=" * 60)
print("Done!")
