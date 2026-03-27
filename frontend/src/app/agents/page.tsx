"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "../../lib/auth";
import { auth } from "../../lib/firebase";
import { listenToAgents } from "../../lib/agents";
import { getAccessStatus } from "../../lib/jobs";
import { AgentMeta, UserAccessStatus } from "../../types";
import Navbar from "../../components/Navbar";
import AgentCard from "../../components/landing/AgentCard";
import { Bot, Search, ShieldCheck, Clock3 } from "lucide-react";

export default function AgentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [search, setSearch] = useState("");
  const [accessStatus, setAccessStatus] = useState<UserAccessStatus | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const accessChecksEnabled = process.env.NEXT_PUBLIC_ENABLE_ACCESS_STATUS === "true";

  useEffect(() => {
    const unsubAuth = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    const unsubAgents = listenToAgents(setAgents);
    return () => {
      unsubAuth();
      unsubAgents();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!accessChecksEnabled) {
        if (!cancelled) {
          setAccessStatus(null);
          setAccessLoading(false);
        }
        return;
      }

      if (!user) {
        if (!cancelled) {
          setAccessStatus(null);
          setAccessLoading(false);
        }
        return;
      }

      setAccessLoading(true);
      try {
        const token = await auth.currentUser!.getIdToken();
        const status = await getAccessStatus(token);
        if (!cancelled) {
          setAccessStatus(status);
        }
      } catch {
        if (!cancelled) {
          setAccessStatus(null);
        }
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [user, accessChecksEnabled]);

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const canLaunch =
    !!user &&
    (!accessChecksEnabled || (!accessLoading && accessStatus?.status === "allowed" && accessStatus.remainingToday > 0));

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Browse{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Agents
              </span>
            </h1>
            <p className="mt-3 text-muted-fg max-w-lg mx-auto">
              Choose a specialized AI agent to handle your task. Each agent has unique capabilities and workflows.
            </p>
          </div>

          {accessChecksEnabled && user && !accessLoading && accessStatus && (
            <div
              className={`mb-8 rounded-2xl border px-4 py-3 text-sm ${
                accessStatus.status === "allowed" && accessStatus.remainingToday > 0
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : accessStatus.status === "allowed"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Access: {accessStatus.status}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  Today: {accessStatus.jobsToday}/{accessStatus.dailyLimit}
                </span>
                <span>{accessStatus.message}</span>
              </div>
            </div>
          )}

          {/* Search */}
          {agents.length > 3 && (
            <div className="mb-8 mx-auto max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>
          )}

          {/* Agent grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {filtered.map((agent) => (
                <AgentCard key={agent.id} agent={agent} signedIn={!!user} canLaunch={canLaunch} />
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
              <Search className="h-10 w-10 opacity-30" />
              <p className="text-sm">No agents match your search.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-fg">
              <Bot className="h-10 w-10 opacity-30" />
              <p className="text-sm">No agents registered yet. Deploy the agent platform to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
