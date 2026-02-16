# Meeting Agent

AI-powered meeting assistant that analyzes transcripts and generates structured outputs.

Record audio or paste a transcript, and the agent decides which tool(s) to invoke:
- **Calendar Invite** — creates `.ics` file + Google Calendar link for follow-up meetings
- **Decision Record** — generates a structured ADR (Architecture Decision Record)
- **Meeting Report** — creates a formatted summary with key points and action items

## Architecture

- **Backend**: Python + FastAPI (managed by `uv`)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **AI**: Raw Python agent loop using OpenRouter (OpenAI-compatible API) — no frameworks
- **Transcription**: faster-whisper (local, runs on CPU)

## Quick Start

### 🛠️ Manual Installation

#### 1. Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- An [OpenRouter](https://openrouter.ai/) API key

#### 2. Backend

```bash
cd backend

# Copy env and add your OpenRouter API key
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY

# Install deps and run
uv sync
uv run python main.py
```

Backend runs at http://localhost:8000

#### 3. Frontend

```bash
cd frontend

npm install
npm run dev
```

Frontend runs at http://localhost:5173 (proxies API calls to backend)

#### 4. Test the agent (CLI)

```bash
cd backend
uv run python test_agent.py
```

### 🚀 Running the App

Open two terminals and run:

**Terminal 1 — Backend:**

```bash
cd backend
uv sync && uv run python main.py
```

> **Note:** `uv sync` ensures dependencies are up-to-date (useful after switching branches).

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install && npm run dev
```

> **Note:** `npm install` ensures dependencies are up-to-date (useful after switching branches).

**Browser:** Open http://localhost:5173

On startup, the backend prints a detailed banner showing initialization progress:

```
🚀 Starting Meeting Agent...
🔵 Loading Whisper model 'base'...
✅ Whisper model 'base' loaded!
🔵 Connecting to LLM at https://openrouter.ai/api/v1...
   Using model: openai/gpt-4o-mini
✅ Connected to LLM API!

🔧 Setting up agent...
✅ Registered tool: create_calendar_invite
✅ Registered tool: create_decision_record
✅ Registered tool: create_report
🤖 Agent initialized with 3 tools
✅ Agent ready!

✅ Ready!
```

When processing a transcript, the terminal logs each phase with color-coded output:

- **PHASE 1: LLM Request** — full payload sent to the model
- **PHASE 2: Tool Execution** — each tool call with success/failure status
- **PHASE 3: Summary Generation** — final LLM response

## Configuration

### OpenRouter API

This app uses [OpenRouter](https://openrouter.ai/) as its LLM provider, which gives access to many models through a single OpenAI-compatible API.

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key ([get one here](https://openrouter.ai/keys)) |
| `OPENROUTER_MODEL` | No | Model to use (default: `openai/gpt-4o-mini`) |
| `GOOGLE_CREDENTIALS_PATH` | No | Path to Google OAuth credentials JSON (for Google Calendar) |

### OpenAI API Compatibility

This app is compatible with any OpenAI API-format LLM provider:

- **OpenRouter** (default) — access to hundreds of models
- **OpenAI API** (direct) — use OpenAI models directly
- **Ollama** — local open-source models
- **LM Studio** — local alternative
- Any other OpenAI-compatible API

To use a different provider, edit `backend/.env`:

```env
# API endpoint (default: OpenRouter)
OPENROUTER_API_KEY=your-api-key-here

# Model to use
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## How the Agent Works

The agent is a simple while-loop in `agent.py` (~80 lines of core logic):

1. Send transcript + system prompt + tool schemas to the LLM via OpenRouter
2. If the LLM returns tool calls, execute them and feed results back
3. Repeat until the LLM returns a final text response
4. Stream all events to the frontend via SSE

No LangChain, no CrewAI, no frameworks — just the `openai` Python SDK.
