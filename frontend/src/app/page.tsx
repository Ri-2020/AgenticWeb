"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange, signInWithGoogle } from "../lib/auth";
import { listenToAgents } from "../lib/agents";
import { AgentMeta } from "../types";
import Navbar from "../components/Navbar";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Eye,
  CheckCircle2,
  Bot,
  ShoppingCart,
  Search,
  FileText,
  Globe,
  MousePointerClick,
  Shield,
  Activity,
  Layers,
  GitBranch,
  Cloud,
  ArrowDown,
  BookOpen,
  MapPin,
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ShoppingCart, Search, FileText, Globe, Bot, BookOpen, MapPin,
};

const AUTHOR_NAME = process.env.NEXT_PUBLIC_AUTHOR_NAME || "the developer";
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "";
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL || "";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [agents, setAgents] = useState<AgentMeta[]>([]);

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

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden noise px-4 pt-24 pb-24 sm:pt-36 sm:pb-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#09090b_0%,#0d1020_55%,#09090b_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(129,140,248,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.15) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />
          <div className="absolute top-[-170px] left-1/2 -translate-x-1/2 h-[780px] w-[980px] rounded-full bg-indigo-500/18 blur-[140px] animate-glow-pulse" />
          <div className="absolute top-36 left-[10%] h-[330px] w-[330px] rounded-full bg-cyan-400/12 blur-[120px] animate-float" />
          <div className="absolute top-16 right-[12%] h-[320px] w-[320px] rounded-full bg-violet-500/14 blur-[120px] animate-float" style={{ animationDelay: "1.4s" }} />
          <div className="absolute bottom-[-240px] left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-[100%] border border-indigo-400/20 bg-gradient-to-t from-indigo-500/15 to-transparent blur-[1px]" />
          <div className="absolute top-[16%] left-[18%] h-3 w-3 rounded-full bg-cyan-300/70 shadow-[0_0_35px_rgba(103,232,249,0.8)]" />
          <div className="absolute top-[26%] right-[22%] h-2.5 w-2.5 rounded-full bg-indigo-300/70 shadow-[0_0_30px_rgba(129,140,248,0.8)]" />
          <div className="absolute top-[42%] right-[16%] h-2 w-2 rounded-full bg-violet-300/70 shadow-[0_0_26px_rgba(196,181,253,0.8)]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered agents at your service
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl animate-fade-in" style={{ animationDelay: "100ms" }}>
            Intelligent agents,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              ready to work
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-fg leading-relaxed animate-fade-in" style={{ animationDelay: "200ms" }}>
            A unified multi-agent platform where specialized AI agents collaborate step-by-step
            to handle complex tasks. Real-time progress tracking, structured results, and
            a growing library of capabilities.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
            {user ? (
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 transition-all"
              >
                Browse Agents
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 transition-all cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-medium text-muted-fg hover:text-foreground hover:border-indigo-500/30 transition-all"
            >
              See how it works
              <ArrowDown className="h-4 w-4" />
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-muted-fg animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Firebase Auth</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Real-time Updates</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-400" />
              <span>Multi-Agent Orchestration</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-sky-400" />
              <span>Google Cloud</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED AGENTS ─── */}
      {agents.length > 0 && (
        <section className="px-4 pt-14 pb-24 sm:pt-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Available Now</p>
                <h2 className="text-2xl font-bold sm:text-3xl">Featured Agents</h2>
              </div>
              <Link
                href="/agents"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {agents.slice(0, 3).map((agent) => {
                const AgentIcon = ICON_MAP[agent.icon] || Bot;
                return (
                  <Link
                    key={agent.id}
                    href={user ? `/agents/${agent.id}` : "#"}
                    onClick={!user ? (e) => { e.preventDefault(); signInWithGoogle(); } : undefined}
                    className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 hover:bg-card-hover hover:border-indigo-500/30 transition-all duration-300 animate-fade-in"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: agent.color + "20" }}
                      >
                        <AgentIcon className="h-6 w-6" style={{ color: agent.color }} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">{agent.name}</h3>
                      <p className="mt-1.5 text-sm text-muted-fg leading-relaxed">{agent.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {agent.steps.slice(0, 2).map((step, i) => (
                          <span key={i} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-fg">
                            {step}
                          </span>
                        ))}
                        {agent.steps.length > 2 && (
                          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-fg">
                            +{agent.steps.length - 2}
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-400 group-hover:gap-2 transition-all">
                        Launch <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}



      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="border-t border-border px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Getting Started</p>
            <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
            <p className="mt-3 text-muted-fg">Four steps from question to answer</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MousePointerClick, title: "Pick an agent", desc: "Choose from our growing library of specialized AI agents.", color: "text-indigo-400", bg: "bg-indigo-500/15" },
              { icon: Zap, title: "Describe your task", desc: "Tell the agent what you need in plain language.", color: "text-amber-400", bg: "bg-amber-500/15" },
              { icon: Eye, title: "Watch it work", desc: "See each step progress in real time as agents collaborate.", color: "text-violet-400", bg: "bg-violet-500/15" },
              { icon: CheckCircle2, title: "Get results", desc: "Receive structured, actionable results you can use immediately.", color: "text-emerald-400", bg: "bg-emerald-500/15" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card`}>
                  <step.icon className={`h-6 w-6 ${step.color}`} />
                </div>
                <div className="mb-1 text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                  Step {i + 1}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-fg">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section className="border-t border-border bg-surface px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Technology</p>
            <h2 className="text-2xl font-bold sm:text-3xl">Built with modern tools</h2>
            <p className="mt-3 text-muted-fg max-w-lg mx-auto">
              Production-grade stack designed for real-time performance and developer experience.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { name: "Next.js 16", desc: "React framework", icon: Globe, color: "text-foreground" },
              { name: "React 19", desc: "UI library", icon: Layers, color: "text-sky-400" },
              { name: "Tailwind CSS 4", desc: "Styling", icon: Sparkles, color: "text-cyan-400" },
              { name: "Firebase", desc: "Auth & Firestore", icon: Shield, color: "text-amber-400" },
              { name: "crewAI", desc: "Agent orchestration", icon: Bot, color: "text-violet-400" },
              { name: "Google Cloud", desc: "Infrastructure", icon: Cloud, color: "text-sky-400" },
              { name: "Pub/Sub", desc: "Message queue", icon: GitBranch, color: "text-emerald-400" },
              { name: "TypeScript", desc: "Type safety", icon: FileText, color: "text-indigo-400" },
            ].map((tech, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center hover:bg-card-hover hover:border-indigo-500/20 transition-all"
              >
                <tech.icon className={`h-6 w-6 ${tech.color}`} />
                <p className="text-sm font-semibold">{tech.name}</p>
                <p className="text-xs text-muted-fg">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-border px-4 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
          <p className="mt-3 text-muted-fg max-w-md mx-auto">
            Sign in with Google and launch your first agent in seconds. No setup required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 transition-all"
              >
                Browse Agents
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/35 transition-all cursor-pointer"
              >
                Sign in with Google
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm text-muted-fg hover:text-foreground transition-colors"
            >
              Learn more about AgentHub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border bg-surface px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold">AgentHub</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-fg">
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/agents" className="hover:text-foreground transition-colors">Agents</Link>
              <Link href="/credentials" className="hover:text-foreground transition-colors">API Keys</Link>
              {GITHUB_URL && (
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  <GithubIcon className="h-4 w-4" />
                </a>
              )}
              {LINKEDIN_URL && (
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  <LinkedinIcon className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-fg">
              Built by {AUTHOR_NAME} with crewAI + Firebase
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
