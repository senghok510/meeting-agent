import ReactMarkdown from "react-markdown";
import {
  Calendar,
  FileCheck,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  Brain,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { downloadICS, downloadMarkdown } from "../api";
import type { AgentEvent } from "../api";

interface Props {
  events: AgentEvent[];
  loading: boolean;
}

export default function ResultsPanel({ events, loading }: Props) {
  if (events.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Brain className="mb-3 h-12 w-12 opacity-30" />
        <p className="text-sm">Results will appear here after analysis</p>
      </div>
    );
  }

  const toolResults = events.filter((e) => e.type === "tool_result");
  const finalMessage = events.find((e) => e.type === "final");
  const errorMessage = events.find((e) => e.type === "error");

  return (
    <div className="flex flex-col gap-4">
      {/* Status events */}
      {loading && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-3 text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Agent is analyzing...</span>
        </div>
      )}

      {/* Thinking / Tool call status */}
      {events
        .filter((e) => e.type === "thinking" || e.type === "tool_call")
        .map((event, i) => (
          <div
            key={`status-${i}`}
            className="flex items-center gap-2 text-xs text-zinc-500"
          >
            {event.type === "thinking" ? (
              <Brain className="h-3 w-3" />
            ) : (
              <Wrench className="h-3 w-3" />
            )}
            <span>
              {event.type === "thinking"
                ? event.content
                : `Calling ${event.tool}...`}
            </span>
          </div>
        ))}

      {/* Tool results — the actual outputs */}
      {toolResults.map((event, i) => {
        const result = event.result as Record<string, unknown> | undefined;
        if (!result) return null;

        switch (result.type) {
          case "calendar_invite":
            return (
              <CalendarCard
                key={`result-${i}`}
                result={result}
              />
            );
          case "decision_record":
            return (
              <DecisionCard
                key={`result-${i}`}
                result={result}
              />
            );
          case "report":
            return (
              <ReportCard
                key={`result-${i}`}
                result={result}
              />
            );
          default:
            return (
              <div
                key={`result-${i}`}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4"
              >
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            );
        }
      })}

      {/* Final summary */}
      {finalMessage && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
            <ReactMarkdown>{finalMessage.content || ""}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-800 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{errorMessage.content}</p>
        </div>
      )}
    </div>
  );
}

function CalendarCard({ result }: { result: Record<string, unknown> }) {
  const details = result.event_details as Record<string, unknown> | undefined;
  const icsContent = result.ics_content as string;
  const googleUrl = result.google_calendar_url as string;

  return (
    <div className="rounded-xl border border-blue-800/50 bg-blue-500/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-blue-400">
        <Calendar className="h-5 w-5" />
        <h3 className="font-semibold">Calendar Invite</h3>
      </div>

      {details && (
        <div className="mb-4 space-y-1 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Event:</span>{" "}
            {details.title as string}
          </p>
          <p>
            <span className="text-zinc-500">Start:</span>{" "}
            {details.start_time as string}
          </p>
          <p>
            <span className="text-zinc-500">End:</span>{" "}
            {details.end_time as string}
          </p>
          {(details.attendees as string[])?.length > 0 && (
            <p>
              <span className="text-zinc-500">Attendees:</span>{" "}
              {(details.attendees as string[]).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => downloadICS(icsContent)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download .ics
        </button>
        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Add to Google Calendar
          </a>
        )}
      </div>
    </div>
  );
}

function DecisionCard({ result }: { result: Record<string, unknown> }) {
  const markdown = result.markdown as string;

  return (
    <div className="rounded-xl border border-amber-800/50 bg-amber-500/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-amber-400">
        <FileCheck className="h-5 w-5" />
        <h3 className="font-semibold">Decision Record</h3>
      </div>
      <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadMarkdown(markdown, "decision-record.md")}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </button>
      </div>
    </div>
  );
}

function ReportCard({ result }: { result: Record<string, unknown> }) {
  const markdown = result.markdown as string;

  return (
    <div className="rounded-xl border border-emerald-800/50 bg-emerald-500/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-emerald-400">
        <FileText className="h-5 w-5" />
        <h3 className="font-semibold">Meeting Report</h3>
      </div>
      <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadMarkdown(markdown, "meeting-report.md")}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </button>
      </div>
    </div>
  );
}
