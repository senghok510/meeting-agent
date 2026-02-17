export interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "final" | "meeting_saved" | "error";
  content?: string;
  tool?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  meeting_id?: number;
}

export interface MeetingSummary {
  id: number;
  title: string;
  summary: string;
  created_at: string;
}

export interface MeetingFull {
  id: number;
  title: string;
  transcript: string;
  results: Record<string, unknown>[];
  summary: string;
  created_at: string;
}

export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ transcript: string }> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Transcription failed" }));
    throw new Error(err.detail || "Transcription failed");
  }

  return res.json();
}

export async function analyzeTranscript(
  transcript: string,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Analysis failed");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const event: AgentEvent = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
        }
      }
    }
  }

  if (buffer.startsWith("data: ")) {
    try {
      const event: AgentEvent = JSON.parse(buffer.slice(6));
      onEvent(event);
    } catch {
    }
  }
}

export async function fetchMeetings(search?: string): Promise<MeetingSummary[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(`/api/meetings?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
}

export async function fetchMeeting(id: number): Promise<MeetingFull> {
  const res = await fetch(`/api/meetings/${id}`);
  if (!res.ok) throw new Error("Meeting not found");
  return res.json();
}

export async function deleteMeeting(id: number): Promise<void> {
  const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete meeting");
}

export function downloadICS(icsContent: string, filename: string = "invite.ics") {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(markdown: string, filename: string = "document.md") {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(csv: string, filename: string = "data.csv") {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
