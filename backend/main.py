import json
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from transcribe import transcribe_audio, get_model as get_whisper_model
from agent import run_agent, client, MODEL
from tools import TOOL_REGISTRY
from database import init_db, save_meeting, get_meetings, get_meeting, delete_meeting


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    print("\n🚀 Starting Meeting Agent...")
    init_db()
    print("✅ Ready! (Whisper loads on first transcription; LLM checked in background)\n")

    # Don't block startup: verify LLM in background thread
    async def _check_llm():
        try:
            await asyncio.to_thread(client.models.list)
            print("✅ LLM API connected")
        except Exception as e:
            print(f"⚠️  LLM check: {e}")

    asyncio.create_task(_check_llm())
    yield


app = FastAPI(title="Meeting Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    transcript: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Accept an audio file and return the transcript."""
    if not file.content_type or not file.content_type.startswith("audio"):
        if file.content_type not in ("video/webm", "application/octet-stream"):
            raise HTTPException(
                status_code=400,
                detail=f"Expected audio file, got {file.content_type}",
            )

    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    transcript = transcribe_audio(audio_bytes, file.filename or "audio.webm")
    return {"transcript": transcript}


@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    """
    Analyze a transcript using the AI agent.
    Returns Server-Sent Events (SSE) streaming the agent's progress.
    Saves the meeting to the database after completion.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")

    collected_results: list[dict] = []
    final_summary = ""
    meeting_title = "Untitled Meeting"

    def event_stream():
        nonlocal final_summary, meeting_title
        for event in run_agent(request.transcript):
            if event["type"] == "tool_result":
                collected_results.append(event.get("result", {}))
            if event["type"] == "final":
                final_summary = event.get("content", "")
                words = final_summary.split()
                meeting_title = " ".join(words[:8]) + ("..." if len(words) > 8 else "")
            yield {"event": event["type"], "data": json.dumps(event)}

        meeting_id = save_meeting(
            transcript=request.transcript,
            results=collected_results,
            summary=final_summary,
            title=meeting_title,
        )
        yield {
            "event": "meeting_saved",
            "data": json.dumps({"type": "meeting_saved", "meeting_id": meeting_id}),
        }

    return EventSourceResponse(event_stream())


# --- Meeting History Endpoints ---


@app.get("/api/meetings")
def list_meetings(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
):
    """List past meetings with optional search."""
    return get_meetings(limit=limit, offset=offset, search=search)


@app.get("/api/meetings/{meeting_id}")
def read_meeting(meeting_id: int):
    """Get a single meeting with full results."""
    meeting = get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@app.delete("/api/meetings/{meeting_id}")
def remove_meeting(meeting_id: int):
    """Delete a meeting."""
    if not delete_meeting(meeting_id):
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
