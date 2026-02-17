import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { transcribeAudio } from "../api";

interface Props {
  onTranscript: (transcript: string) => void;
}

export default function AudioRecorder({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });

        if (blob.size === 0) {
          setError("Recording was empty");
          return;
        }

        setTranscribing(true);
        try {
          const { transcript } = await transcribeAudio(blob);
          onTranscript(transcript);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(1000);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("Could not access microphone. Check browser permissions.");
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {recording ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />
            <button
              onClick={stopRecording}
              className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
            >
              <Square className="h-8 w-8" />
            </button>
          </div>
          <p className="text-lg font-mono text-red-500">{formatTime(elapsed)}</p>
          <p className="text-sm text-zinc-400">Recording... Click to stop</p>
        </>
      ) : transcribing ? (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
          <p className="text-sm text-zinc-400">Transcribing audio...</p>
        </>
      ) : (
        <>
          <button
            onClick={startRecording}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition hover:bg-blue-600 hover:scale-105"
          >
            <Mic className="h-8 w-8" />
          </button>
          <p className="text-sm text-zinc-400">Click to start recording</p>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
