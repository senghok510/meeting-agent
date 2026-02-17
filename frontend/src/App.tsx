import { useState, useCallback } from "react";
import { Mic, ClipboardPaste, Bot, History, Plus, ArrowLeft } from "lucide-react";
import AudioRecorder from "./components/AudioRecorder";
import TranscriptInput from "./components/TranscriptInput";
import ResultsPanel from "./components/ResultsPanel";
import MeetingHistory from "./components/MeetingHistory";
import { analyzeTranscript, fetchMeeting } from "./api";
import type { AgentEvent } from "./api";

type InputTab = "record" | "paste";
type Page = "new" | "history" | "view";

function App() {
  const [inputTab, setInputTab] = useState<InputTab>("paste");
  const [page, setPage] = useState<Page>("new");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (text: string) => {
    setTranscript(text);
    setEvents([]);
    setLoading(true);
    setPage("new");

    try {
      await analyzeTranscript(text, (event) => {
        setEvents((prev) => [...prev, event]);
      });
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          content: err instanceof Error ? err.message : "Analysis failed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTranscriptFromRecording = useCallback(
    (text: string) => {
      setTranscript(text);
      handleAnalyze(text);
    },
    [handleAnalyze]
  );

  const handleReset = () => {
    setEvents([]);
    setTranscript(null);
    setLoading(false);
  };

  const handleViewMeeting = useCallback(async (id: number) => {
    try {
      const meeting = await fetchMeeting(id);
      setTranscript(meeting.transcript);

      const reconstructedEvents: AgentEvent[] = [];
      for (const result of meeting.results) {
        reconstructedEvents.push({
          type: "tool_result",
          result: result as Record<string, unknown>,
        });
      }
      if (meeting.summary) {
        reconstructedEvents.push({
          type: "final",
          content: meeting.summary,
        });
      }
      setEvents(reconstructedEvents);
      setPage("view");
    } catch {
      // ignore
    }
  }, []);

  const handleBackToHistory = () => {
    setPage("history");
    setEvents([]);
    setTranscript(null);
  };

  const handleNewMeeting = () => {
    handleReset();
    setPage("new");
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-3">
          <Bot className="h-7 w-7 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Meeting Agent</h1>
            <p className="text-xs text-zinc-500">
              Record or paste a transcript — AI generates reports, decisions, and
              calendar invites
            </p>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleNewMeeting}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                page === "new"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => setPage("history")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                page === "history" || page === "view"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* History page */}
        {page === "history" && (
          <MeetingHistory onSelectMeeting={handleViewMeeting} />
        )}

        {/* Viewing a past meeting */}
        {page === "view" && (
          <div>
            <button
              onClick={handleBackToHistory}
              className="mb-6 flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </button>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Left: Transcript */}
              <section>
                <h2 className="mb-4 text-sm font-medium text-zinc-400">
                  Transcript
                </h2>
                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 max-h-[60vh] overflow-y-auto">
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {transcript}
                  </p>
                </div>
              </section>

              {/* Right: Results */}
              <section>
                <h2 className="mb-4 text-sm font-medium text-zinc-400">
                  Results
                </h2>
                <ResultsPanel events={events} loading={false} />
              </section>
            </div>
          </div>
        )}

        {/* New analysis page */}
        {page === "new" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left: Input */}
            <section>
              {/* Tabs */}
              <div className="mb-4 flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-1">
                <button
                  onClick={() => setInputTab("record")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    inputTab === "record"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mic className="h-4 w-4" />
                  Record
                </button>
                <button
                  onClick={() => setInputTab("paste")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    inputTab === "paste"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste Text
                </button>
              </div>

              {/* Tab content */}
              {inputTab === "record" ? (
                <AudioRecorder onTranscript={handleTranscriptFromRecording} />
              ) : (
                <TranscriptInput onSubmit={handleAnalyze} disabled={loading} />
              )}

              {/* Show transcript if from recording */}
              {transcript && inputTab === "record" && (
                <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
                  <p className="mb-1 text-xs font-medium text-zinc-500">
                    Transcript
                  </p>
                  <p className="text-sm text-zinc-300">{transcript}</p>
                </div>
              )}
            </section>

            {/* Right: Results */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-400">Results</h2>
                {events.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-zinc-500 transition hover:text-zinc-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ResultsPanel events={events} loading={loading} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
