export interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "final" | "error";
  content?: string;
  tool?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
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
          // skip malformed lines
        }
      }
    }
  }

  // process any remaining buffer
  if (buffer.startsWith("data: ")) {
    try {
      const event: AgentEvent = JSON.parse(buffer.slice(6));
      onEvent(event);
    } catch {
      // skip
    }
  }
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
