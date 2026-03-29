"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { onAuthChange } from "../../../lib/auth";
import { listenToJob, listenToAgentJobs } from "../../../lib/jobs";
import { AgentMeta, Job } from "../../../types";
import Navbar from "../../../components/Navbar";
import StepProgress from "../../../components/agent/StepProgress";
import JobHistory from "../../../components/agent/JobHistory";
import ResultRenderer from "../../../components/results/ResultRenderer";
import {
  Bot,
  ShoppingCart,
  Search,
  FileText,
  Globe,
  BookOpen,
  MapPin,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ShoppingCart,
  Search,
  FileText,
  Globe,
  Bot,
  BookOpen,
  MapPin,
};

export default function JobPage() {
  const pathname = usePathname();
  const jobId = pathname?.split("/").filter(Boolean).pop() ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [agent, setAgent] = useState<AgentMeta | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // Listen to the job
  useEffect(() => {
    if (authLoading || !user) return;
    return listenToJob(jobId, setJob);
  }, [authLoading, user, jobId]);

  // Load agent metadata once we know the agentType
  useEffect(() => {
    if (!job?.agentType) return;
    const unsub = onSnapshot(doc(db, "agents", job.agentType), (snap) => {
      if (snap.exists()) {
        setAgent({ id: snap.id, ...snap.data() } as AgentMeta);
      }
    });
    return unsub;
  }, [job?.agentType]);

  // Load related jobs from same agent
  useEffect(() => {
    if (!user || !job?.agentType) return;
    return listenToAgentJobs(user.uid, job.agentType, setRelatedJobs);
  }, [user, job?.agentType]);

  const handleSelectJob = useCallback((selected: Job) => {
    window.history.pushState(null, "", `/jobs/${selected.id}`);
    setJob(selected);
    // Re-listen if in progress
    if (selected.status === "pending" || selected.status === "processing") {
      listenToJob(selected.id, setJob);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-fg">Please sign in to view this job.</p>
        </div>
      </div>
    );
  }

  const Icon = agent ? ICON_MAP[agent.icon] || Bot : Bot;
  const isActive = job?.status === "pending" || job?.status === "processing";
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";
  const statusBadgeConfig = job ? {
    pending: { icon: Clock, label: "Queued", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    processing: { icon: Loader2, label: "Running", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    completed: { icon: CheckCircle2, label: "Complete", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    failed: { icon: XCircle, label: "Failed", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  }[job.status] : null;

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} />

      <div className="flex-1 flex">
        {/* Sidebar — related jobs */}
        {relatedJobs.length > 1 && (
          <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-muted-fg">Job History</h3>
              {agent && (
                <Link
                  href={`/agents/${agent.id}`}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New
                </Link>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {relatedJobs.map((rj) => {
                const isSelected = rj.id === jobId;
                const StatusIcon = {
                  pending: Clock,
                  processing: Loader2,
                  completed: CheckCircle2,
                  failed: XCircle,
                }[rj.status];
                const statusColor = {
                  pending: "text-amber-400",
                  processing: "text-indigo-400",
                  completed: "text-emerald-400",
                  failed: "text-red-400",
                }[rj.status];
                return (
                  <button
                    key={rj.id}
                    onClick={() => handleSelectJob(rj)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer border-b border-border/50 last:border-0 ${
                      isSelected
                        ? "bg-indigo-500/10 border-l-2 border-l-indigo-500"
                        : "hover:bg-card-hover"
                    }`}
                  >
                    <StatusIcon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${statusColor} ${
                        rj.status === "processing" ? "animate-spin" : ""
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{rj.query}</p>
                      <p className="text-xs text-muted-fg mt-0.5">
                        {rj.createdAt.toLocaleDateString(undefined, {
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
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
            {/* Back + agent info */}
            <div className="mb-8 animate-fade-in">
              <Link
                href={agent ? `/agents/${agent.id}` : "/agents"}
                className="inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {agent ? `Back to ${agent.name}` : "Back to Agents"}
              </Link>

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {agent && (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: agent.color + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: agent.color }} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">
                      {job?.query || "Loading..."}
                    </h1>
                    <p className="text-xs text-muted-fg mt-0.5">
                      {job?.createdAt.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                {job && statusBadgeConfig && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeConfig.cls}`}>
                    <statusBadgeConfig.icon className={`h-3 w-3 ${job.status === "processing" ? "animate-spin" : ""}`} />
                    {statusBadgeConfig.label}
                  </span>
                )}
              </div>
            </div>

            {/* Step progress */}
            {job && isActive && (
              <div className="mb-8 animate-fade-in-up">
                <StepProgress
                  steps={job.steps}
                  currentStep={job.currentStep}
                  stepMessage={job.stepMessage}
                />
              </div>
            )}

            {/* Results */}
            {job && agent && (isComplete || isFailed) && (
              <div className="animate-fade-in-up">
                <ResultRenderer job={job} outputType={agent.outputType} />
              </div>
            )}

            {/* Waiting state */}
            {job && job.status === "pending" && job.steps.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16 animate-fade-in">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-indigo-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Preparing your agent</p>
                  <p className="text-sm text-muted-fg mt-1">This usually takes a few seconds...</p>
                </div>
              </div>
            )}

            {/* Mobile job history */}
            {relatedJobs.length > 1 && (
              <div className="mt-10 lg:hidden">
                <JobHistory
                  jobs={relatedJobs}
                  activeJobId={jobId}
                  onSelect={handleSelectJob}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
