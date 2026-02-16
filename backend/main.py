import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from transcribe import transcribe_audio, get_model as get_whisper_model
from agent import run_agent, client, MODEL
from tools import TOOL_REGISTRY


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🚀 Starting Meeting Agent...")

    print("🔵 Loading Whisper model 'base'...")
    get_whisper_model()
    print("✅ Whisper model 'base' loaded!")

    print(f"🔵 Connecting to LLM at {client.base_url}...")
    print(f"   Using model: {MODEL}")
    try:
        client.models.list()
        print("✅ Connected to LLM API!")
    except Exception as e:
        print(f"⚠️  Could not verify LLM connection: {e}")

    print("\n🔧 Setting up agent...")
    for tool_name in TOOL_REGISTRY:
        print(f"✅ Registered tool: {tool_name}")
    print(f"🤖 Agent initialized with {len(TOOL_REGISTRY)} tools")
    print("✅ Agent ready!")

    print("\n✅ Ready!\n")

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
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty")

    def event_stream():
        for event in run_agent(request.transcript):
            yield {"event": event["type"], "data": json.dumps(event)}

    return EventSourceResponse(event_stream())


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
