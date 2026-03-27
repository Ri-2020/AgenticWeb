"use client";

import Link from "next/link";
import { AgentMeta } from "../../types";
import { ShoppingCart, Search, FileText, Globe, Bot, ArrowRight, BookOpen, MapPin } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ShoppingCart,
  Search,
  FileText,
  Globe,
  Bot,
  BookOpen,
  MapPin,
};

interface AgentCardProps {
  agent: AgentMeta;
  signedIn: boolean;
  canLaunch?: boolean;
}

export default function AgentCard({ agent, signedIn, canLaunch = true }: AgentCardProps) {
  const Icon = ICON_MAP[agent.icon] || Bot;
  const launchEnabled = signedIn && canLaunch;

  const content = (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 hover:bg-card-hover hover:border-indigo-500/30 transition-all duration-300 animate-fade-in">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        {/* Icon */}
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: agent.color + "20" }}
        >
          <Icon className="h-6 w-6" style={{ color: agent.color }} />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground">{agent.name}</h3>
        <p className="mt-1.5 text-sm text-muted-fg leading-relaxed flex-1">
          {agent.description}
        </p>

        {/* Steps preview */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {agent.steps.slice(0, 3).map((step, i) => (
            <span
              key={i}
              className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-fg"
            >
              {step}
            </span>
          ))}
          {agent.steps.length > 3 && (
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-fg">
              +{agent.steps.length - 3} more
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-5 flex items-center gap-1 text-sm font-medium text-indigo-400 group-hover:gap-2 transition-all">
          {!signedIn ? "Sign in to use" : launchEnabled ? "Launch agent" : "Access pending"}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  if (launchEnabled) {
    return <Link href={`/agents/${agent.id}`}>{content}</Link>;
  }

  return content;
}
