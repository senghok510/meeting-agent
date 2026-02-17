import { useState } from "react";
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
  Mail,
  Copy,
  Check,
  ListChecks,
  Activity,
} from "lucide-react";
import { downloadICS, downloadMarkdown, downloadCSV, copyToClipboard } from "../api";
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

  // Extract sentiment badge if present
  const sentimentResult = toolResults.find(
    (e) => e.result && (e.result as Record<string, unknown>).type === "sentiment"
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Sentiment badge at top */}
      {sentimentResult && (
        <SentimentBadge result={sentimentResult.result as Record<string, unknown>} />
      )}

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

      {/* Tool results */}
      {toolResults.map((event, i) => {
        const result = event.result as Record<string, unknown> | undefined;
        if (!result) return null;

        switch (result.type) {
          case "calendar_invite":
            return <CalendarCard key={`result-${i}`} result={result} />;
          case "decision_record":
            return <DecisionCard key={`result-${i}`} result={result} />;
          case "report":
            return <ReportCard key={`result-${i}`} result={result} />;
          case "email_summary":
            return <EmailCard key={`result-${i}`} result={result} />;
          case "action_items":
            return <ActionItemsCard key={`result-${i}`} result={result} />;
          case "sentiment":
            return null; // rendered as badge at top
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

// --- Sentiment Badge ---

function SentimentBadge({ result }: { result: Record<string, unknown> }) {
  const badge = result.badge as string;
  const badgeColor = result.badge_color as string;
  const details = result.details as Record<string, unknown> | undefined;
  const conflict = result.conflict_detected as boolean;

  const colorMap: Record<string, string> = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-800/50",
    red: "bg-red-500/10 text-red-400 border-red-800/50",
    yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-800/50",
    blue: "bg-blue-500/10 text-blue-400 border-blue-800/50",
    gray: "bg-zinc-500/10 text-zinc-400 border-zinc-700/50",
  };

  const colors = colorMap[badgeColor] || colorMap.gray;
  const score = details?.productivity_score as number | undefined;
  const emotions = details?.key_emotions as string[] | undefined;
  const toneDetails =
    typeof details?.tone_details === "string" ? details.tone_details : undefined;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${colors}`}>
      <Activity className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{badge}</span>
          {score && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              Productivity: {score}/10
            </span>
          )}
          {conflict && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
              Conflict
            </span>
          )}
        </div>
        {toneDetails && (
          <p className="mt-1 text-xs opacity-80">{toneDetails}</p>
        )}
        {emotions && emotions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {emotions.map((e, i) => (
              <span
                key={i}
                className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Calendar Card ---

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

// --- Decision Card ---

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

// --- Report Card ---

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

// --- Email Summary Card ---

function EmailCard({ result }: { result: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);
  const subject = result.subject as string;
  const bodyPlain = result.body_plain as string;
  const metadata = result.metadata as Record<string, unknown> | undefined;
  const attendees = metadata?.attendees as string[] | undefined;

  const handleCopy = async () => {
    await copyToClipboard(`Subject: ${subject}\n\n${bodyPlain}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-violet-800/50 bg-violet-500/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-violet-400">
        <Mail className="h-5 w-5" />
        <h3 className="font-semibold">Email Summary</h3>
      </div>

      <div className="mb-3 space-y-1 text-sm text-zinc-300">
        <p>
          <span className="text-zinc-500">Subject:</span> {subject}
        </p>
        {attendees && attendees.length > 0 && (
          <p>
            <span className="text-zinc-500">To:</span> {attendees.join(", ")}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-zinc-900/50 p-3 text-xs text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
        {bodyPlain}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy to Clipboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- Action Items Card ---

function ActionItemsCard({ result }: { result: Record<string, unknown> }) {
  const items = result.items as Array<Record<string, string>> | undefined;
  const markdown = result.markdown as string;
  const csv = result.csv as string;

  const priorityColors: Record<string, string> = {
    high: "bg-red-500/20 text-red-300",
    medium: "bg-yellow-500/20 text-yellow-300",
    low: "bg-green-500/20 text-green-300",
  };

  return (
    <div className="rounded-xl border border-orange-800/50 bg-orange-500/5 p-5">
      <div className="mb-3 flex items-center gap-2 text-orange-400">
        <ListChecks className="h-5 w-5" />
        <h3 className="font-semibold">Action Items</h3>
        {items && (
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-zinc-900/30 px-3 py-2.5"
            >
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-600 text-xs text-zinc-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{item.task}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      priorityColors[item.priority] || priorityColors.medium
                    }`}
                  >
                    {(item.priority || "medium").toUpperCase()}
                  </span>
                  {item.assignee && item.assignee !== "Unassigned" && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {item.assignee}
                    </span>
                  )}
                  {item.deadline && item.deadline !== "TBD" && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      Due: {item.deadline}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => downloadMarkdown(markdown, "action-items.md")}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-orange-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </button>
        <button
          onClick={() => downloadCSV(csv, "action-items.csv")}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
        >
          <Download className="h-3.5 w-3.5" />
          Download .csv
        </button>
      </div>
    </div>
  );
}
