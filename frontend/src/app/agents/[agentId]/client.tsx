"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import { onAuthChange } from "../../../lib/auth";
import { createJob, listenToAgentJobs, getAccessStatus, joinWaitlist, CloudFunctionError } from "../../../lib/jobs";
import { AgentMeta, Job, UserAccessStatus } from "../../../types";
import Navbar from "../../../components/Navbar";
import AgentForm from "../../../components/agent/AgentForm";
import {
  Bot,
  ShoppingCart,
  Search,
  FileText,
  Globe,
  BookOpen,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Hourglass,
  UserPlus,
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
  Briefcase,
};

export default function AgentPage() {
  const pathname = usePathname();
  const router = useRouter();
  const agentId = pathname?.split("/").filter(Boolean).pop() ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [agent, setAgent] = useState<AgentMeta | null>(null);
  const [pastJobs, setPastJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const accessChecksEnabled = process.env.NEXT_PUBLIC_ENABLE_ACCESS_STATUS === "true";

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "agents", agentId), (snap) => {
      if (snap.exists()) {
        setAgent({ id: snap.id, ...snap.data() } as AgentMeta);
      }
    });
    return unsub;
  }, [agentId]);

  useEffect(() => {
    if (!user) return;
    return listenToAgentJobs(user.uid, agentId, setPastJobs, 10);
  }, [user, agentId]);

  const refreshAccessStatus = useCallback(async () => {
    if (!accessChecksEnabled) {
      setAccessStatus(null);
      setAccessLoading(false);
      return;
    }

    if (!user) {
      setAccessStatus(null);
      setAccessLoading(false);
      return;
    }

    setAccessLoading(true);
    try {
      const idToken = await auth.currentUser!.getIdToken();
      const status = await getAccessStatus(idToken);
      setAccessStatus(status);
    } catch (err) {
      console.warn("Access status unavailable:", err);
      setAccessStatus(null);
    } finally {
      setAccessLoading(false);
    }
  }, [user, accessChecksEnabled]);

  useEffect(() => {
    refreshAccessStatus();
  }, [refreshAccessStatus]);

  const handleJoinWaitlist = useCallback(async () => {
    if (!user || requesting) return;
    setRequesting(true);
    setRequestError(null);
    try {
      const idToken = await auth.currentUser!.getIdToken();
      await joinWaitlist(idToken);
      await refreshAccessStatus();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Failed to join waitlist. Please try again.");
    } finally {
      setRequesting(false);
    }
  }, [user, requesting, refreshAccessStatus]);

  const handleSubmit = useCallback(
    async (values: Record<string, string>) => {
      if (!user || !agent) return;
      const rawQuery = (values.query || "").trim();
      if (!rawQuery) {
        setError("Please enter a query before submitting.");
        return;
      }

      // Compose optional structured fields as a prefix so the agent gets richer context.
      const UNSET = "Not specified";
      const contextParts: string[] = [];
      if (values.current_role && values.current_role !== UNSET)
        contextParts.push(`Role: ${values.current_role}`);
      if (values.experience && values.experience !== UNSET)
        contextParts.push(`Experience: ${values.experience}`);
      if (values.goal && values.goal !== UNSET)
        contextParts.push(`Goal: ${values.goal}`);
      const query = contextParts.length > 0
        ? `[${contextParts.join(" | ")}] ${rawQuery}`
        : rawQuery;

      if (accessChecksEnabled) {
        if (accessLoading) return;
        if (!accessStatus) {
          setError("Unable to verify your access right now. Please retry.");
          return;
        }
        if (accessStatus.status !== "allowed") {
          setError(accessStatus.message || "You are currently on the waitlist.");
          return;
        }
        if (accessStatus.remainingToday <= 0) {
          setError("Daily limit reached. Maximum 3 jobs per day.");
          return;
        }
      }

      setSubmitting(true);
      setError(null);

      try {
        const idToken = await auth.currentUser!.getIdToken();
        const jobId = await createJob(
          idToken,
          agentId,
          query,
          values.country || "India",
        );
        router.push(`/jobs/${jobId}`);
      } catch (err) {
        if (
          err instanceof CloudFunctionError &&
          (err.code === "NOT_ON_WAITLIST" || err.code === "WAITLISTED" || err.code === "ACCESS_BLOCKED" || err.code === "DAILY_LIMIT_EXCEEDED")
        ) {
          await refreshAccessStatus();
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
        setSubmitting(false);
      }
    },
    [user, agent, accessChecksEnabled, accessLoading, accessStatus, agentId, router, refreshAccessStatus],
  );

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
        <Navbar user={null} showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-fg">Please sign in to use this agent.</p>
        </div>
      </div>
    );
  }

  const Icon = agent ? ICON_MAP[agent.icon] || Bot : Bot;

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

  const canCreateJobs =
    !accessChecksEnabled ||
    (!accessLoading && accessStatus?.status === "allowed" && accessStatus.remainingToday > 0);

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} showBack />

      <main className="flex-1 px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          {/* Agent header */}
          {agent && (
            <div className="mb-10 text-center animate-fade-in">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: agent.color + "20" }}
              >
                <Icon className="h-8 w-8" style={{ color: agent.color }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{agent.name}</h1>
              <p className="mt-2 text-muted-fg max-w-md mx-auto">{agent.description}</p>

              {/* Steps preview */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {agent.steps.map((step, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-fg"
                  >
                    <span className="text-[10px] font-bold text-indigo-400">{i + 1}</span>
                    {step}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Query form */}
          {agent && (
            <div className="animate-fade-in-up">
              {accessChecksEnabled && accessLoading && (
                <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-fg">
                  Checking your access and daily quota...
                </div>
              )}

              {/* Status: none — user hasn't joined waitlist yet */}
              {accessChecksEnabled && !accessLoading && accessStatus?.status === "none" && (
                <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-4 text-sm text-indigo-200">
                  <p className="mb-3">{accessStatus.message}</p>
                  <button
                    onClick={handleJoinWaitlist}
                    disabled={requesting}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                  >
                    {requesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {requesting ? "Joining…" : "Join Waitlist"}
                  </button>
                  {requestError && (
                    <p className="mt-2 text-xs text-red-400">{requestError}</p>
                  )}
                </div>
              )}

              {/* Status: waitlisted — already on waitlist, waiting for approval */}
              {accessChecksEnabled && !accessLoading && accessStatus?.status === "waitlisted" && (
                <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
                  <div className="flex items-center gap-2">
                    <Hourglass className="h-4 w-4 shrink-0" />
                    <span>{accessStatus.message}</span>
                  </div>
                </div>
              )}

              {/* Status: allowed — show quota */}
              {accessChecksEnabled && !accessLoading && accessStatus?.status === "allowed" && (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                    accessStatus.remainingToday > 0
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      Access: granted
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Hourglass className="h-4 w-4" />
                      Today: {accessStatus.jobsToday}/{accessStatus.dailyLimit}
                    </span>
                    <span>{accessStatus.message}</span>
                  </div>
                </div>
              )}

              <AgentForm
                inputFields={agent.inputFields}
                onSubmit={handleSubmit}
                isLoading={submitting || accessLoading}
                disabled={!canCreateJobs}
                accentColor={agent.color}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          {/* Recent jobs */}
          {pastJobs.length > 0 && (
            <div className="mt-12 animate-fade-in">
              <h3 className="text-sm font-semibold text-muted-fg mb-4">Recent Jobs</h3>
              <div className="space-y-2">
                {pastJobs.map((job) => {
                  const JobIcon = STATUS_ICON[job.status] || Clock;
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-card-hover hover:border-indigo-500/30 transition-all"
                    >
                      <JobIcon
                        className={`h-4 w-4 shrink-0 ${STATUS_COLOR[job.status]} ${
                          job.status === "processing" ? "animate-spin" : ""
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{job.query}</p>
                        <p className="text-xs text-muted-fg mt-0.5">
                          {job.createdAt.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-fg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
