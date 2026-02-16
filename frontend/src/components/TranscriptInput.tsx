import { useState } from "react";
import { FileText, Send } from "lucide-react";

interface Props {
  onSubmit: (transcript: string) => void;
  disabled?: boolean;
}

export default function TranscriptInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <FileText className="h-4 w-4" />
        <span className="text-sm">Paste your meeting transcript below</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste meeting transcript here...&#10;&#10;Example:&#10;John: Let's schedule a follow-up meeting next Tuesday at 2pm.&#10;Sarah: Agreed. We also decided to switch from PostgreSQL to MongoDB.&#10;John: Great, let's document that decision and send out the meeting notes."
        className="min-h-[240px] w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
        disabled={disabled}
      />

      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="flex items-center justify-center gap-2 self-end rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
        Analyze Transcript
      </button>
    </div>
  );
}
