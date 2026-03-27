"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "../../lib/auth";
import Navbar from "../../components/Navbar";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Globe,
  Cloud,
  Database,
  Monitor,
  Shield,
  Layers,
  GitBranch,
  Sparkles,
  FileText,
  Zap,
  ArrowDown,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME || "the developer";
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "";
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL || "";
const DEVELOPER_PHOTO_URL = "https://avatars.githubusercontent.com/u/74013705?v=4";

export default function AboutPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} showBack backLabel="Home" />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-indigo-500/8 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Bot className="h-3.5 w-3.5" />
            About AgentHub
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Multi-agent AI,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              made accessible
            </span>
          </h1>
          <p className="mt-5 text-muted-fg text-lg leading-relaxed max-w-2xl mx-auto">
            AgentHub is an open-source platform that makes it easy to deploy, manage, and interact
            with specialized AI agents. Built as a learning project and a real-world showcase of
            modern cloud-native architecture.
          </p>
        </div>
      </section>

      {/* ─── ABOUT THE BUILDER ─── */}
      <section className="border-t border-border bg-surface px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-card p-8 sm:p-10 animate-fade-in">
            <div className="pointer-events-none absolute inset-0 -z-0">
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-indigo-500/16 blur-3xl" />
              <div className="absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-violet-500/12 blur-3xl" />
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6 sm:gap-7">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-400/70 to-violet-500/70 blur-sm" />
                <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/15 bg-muted">
                  <Image
                    src={DEVELOPER_PHOTO_URL}
                    alt={`${AUTHOR_NAME} profile`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold sm:text-2xl">Built by {AUTHOR_NAME}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                    <Sparkles className="h-3 w-3" />
                    AI Engineer
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-fg">Agent orchestration</span>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-fg">Real-time systems</span>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-muted-fg">Cloud-native apps</span>
                </div>

                <p className="mt-4 text-muted-fg leading-relaxed">
                  This project explores the intersection of AI agent orchestration and real-time
                  web applications. It demonstrates how multiple AI agents can collaborate on
                  complex tasks while providing live progress feedback to users, all running
                  on a serverless Google Cloud stack.
                </p>
                <p className="mt-3 text-muted-fg leading-relaxed">
                  The platform is designed to be extensible — adding a new agent type requires
                  only a crew definition and config files. The frontend automatically picks up
                  new agents from the Firestore registry.
                </p>

                {/* Social links */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {GITHUB_URL && (
                    <a
                      href={GITHUB_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200 hover:bg-indigo-500/15 hover:border-indigo-400/50 transition-all"
                    >
                      <GithubIcon className="h-4 w-4" />
                      GitHub
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                  {LINKEDIN_URL && (
                    <a
                      href={LINKEDIN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:bg-sky-500/15 hover:border-sky-400/50 transition-all"
                    >
                      <LinkedinIcon className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                  {(GITHUB_URL || LINKEDIN_URL) && (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-fg">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Open to collaborations
                    </span>
                  )}
                  {!GITHUB_URL && !LINKEDIN_URL && (
                    <p className="text-xs text-muted-fg italic">
                      Social links not configured. Set NEXT_PUBLIC_GITHUB_URL and NEXT_PUBLIC_LINKEDIN_URL in .env.local
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ─── TECH STACK DETAIL ─── */}
      <section className="border-t border-border bg-surface px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Stack</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Technology breakdown</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <TechGroup
              title="Frontend"
              color="text-violet-400"
              items={[
                "Next.js 16 (App Router)",
                "React 19",
                "TypeScript (strict)",
                "Tailwind CSS 4",
                "Firebase SDK 12",
                "Lucide Icons",
              ]}
            />
            <TechGroup
              title="Backend"
              color="text-sky-400"
              items={[
                "Google Cloud Functions (gen2)",
                "Python 3.12",
                "Firebase Admin SDK",
                "Google Pub/Sub",
                "Fernet encryption",
              ]}
            />
            <TechGroup
              title="Agent Platform"
              color="text-emerald-400"
              items={[
                "crewAI v1.10",
                "Gemini (via LiteLLM)",
                "Cloud Run (Docker)",
                "Firestore real-time writes",
                "Serper API (web search)",
                "Custom scraping tools",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── ADDING AN AGENT ─── */}
      <section className="border-t border-border px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Extensibility</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Adding a new agent</h2>
            <p className="mt-3 text-muted-fg">
              The platform is designed to make agent development fast. Here&#39;s the process:
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Define metadata",
                desc: "Create __init__.py with METADATA — name, description, icon, input fields, step names, and output type.",
                path: "agents/src/agents/<name>/__init__.py",
              },
              {
                step: "2",
                title: "Build the crew",
                desc: "Write a @CrewBase class with agent definitions and sequential tasks in YAML config.",
                path: "agents/src/agents/<name>/crew.py",
              },
              {
                step: "3",
                title: "Register in router",
                desc: "Add one line to the router mapping agentType to your crew class.",
                path: "agents/src/agents/router.py",
              },
              {
                step: "4",
                title: "Deploy",
                desc: "Run deploy.sh — the agent auto-registers in Firestore and appears in the frontend.",
                path: "./deploy.sh cloud",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-xl border border-border bg-card p-5 hover:bg-card-hover transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-400">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-fg">{item.desc}</p>
                  <code className="mt-2 inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-indigo-300 font-mono">
                    {item.path}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-border bg-surface px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-bold">Want to try it out?</h2>
          <p className="mt-2 text-muted-fg text-sm">
            Sign in and run your first agent in seconds.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/agents"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl transition-all"
            >
              Browse Agents <ArrowRight className="h-4 w-4" />
            </Link>
            {GITHUB_URL && (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-fg hover:text-foreground hover:border-indigo-500/30 transition-all"
              >
                <GithubIcon className="h-4 w-4" />
                View Source
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-xs text-muted-fg">
          <Link href="/" className="hover:text-foreground transition-colors">AgentHub</Link>
          <span>Built by {AUTHOR_NAME}</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Helper Components ── */

function ArchNode({
  icon: Icon,
  color,
  bg,
  title,
  lines,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:bg-card-hover transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-4.5 w-4.5 ${color}`} />
        </div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-fg">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-fg/40" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TechGroup({
  title,
  color,
  items,
}: {
  title: string;
  color: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className={`text-sm font-semibold ${color} mb-3`}>{title}</h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-fg">
            <span className="h-1 w-1 shrink-0 rounded-full bg-muted-fg/40" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
