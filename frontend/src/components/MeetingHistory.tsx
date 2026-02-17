import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Trash2,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { fetchMeetings, deleteMeeting } from "../api";
import type { MeetingSummary } from "../api";

interface Props {
  onSelectMeeting: (id: number) => void;
}

export default function MeetingHistory({ onSelectMeeting }: Props) {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMeetings(search || undefined);
      setMeetings(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadMeetings, 300);
    return () => clearTimeout(timer);
  }, [loadMeetings]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Delete this meeting?")) return;
    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "Z");
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search past meetings..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm">Loading meetings...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && meetings.length === 0 && (
        <div className="flex flex-col items-center py-12 text-zinc-500">
          <Calendar className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            {search ? "No meetings match your search" : "No past meetings yet"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Analyze a transcript to create your first meeting
          </p>
        </div>
      )}

      {/* Meeting list */}
      {!loading &&
        meetings.map((meeting) => (
          <button
            key={meeting.id}
            onClick={() => onSelectMeeting(meeting.id)}
            className="group flex items-start gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium text-zinc-200">
                  {meeting.title}
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {formatDate(meeting.created_at)}
              </p>
              {meeting.summary && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                  {meeting.summary}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleDelete(e, meeting.id)}
                className="rounded p-1 text-zinc-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                title="Delete meeting"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:text-zinc-400" />
            </div>
          </button>
        ))}
    </div>
  );
}
