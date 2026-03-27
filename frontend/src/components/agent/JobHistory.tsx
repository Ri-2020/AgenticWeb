"use client";

import { Job } from "../../types";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface JobHistoryProps {
  jobs: Job[];
  activeJobId?: string;
  onSelect: (job: Job) => void;
}

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-400",
  processing: "text-indigo-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

export default function JobHistory({ jobs, activeJobId, onSelect }: JobHistoryProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Jobs</h3>
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {jobs.map((job) => {
          const Icon = STATUS_ICON[job.status] || Clock;
          const isActive = job.id === activeJobId;
          return (
            <button
              key={job.id}
              onClick={() => onSelect(job)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-card-hover transition-colors cursor-pointer border-b border-border/50 last:border-0 ${
                isActive ? "bg-indigo-500/10 border-l-2 border-l-indigo-500" : ""
              }`}
            >
              <Icon
                className={`h-4 w-4 mt-0.5 shrink-0 ${STATUS_COLOR[job.status]} ${
                  job.status === "processing" ? "animate-spin" : ""
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{job.query}</p>
                <p className="text-xs text-muted-fg mt-0.5">
                  {job.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
