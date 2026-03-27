"use client";

import { ExternalLink, ChevronDown, ChevronUp, Shield, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";

interface Source {
  title: string;
  url: string;
  snippet: string;
}

interface Viewpoint {
  position: string;
  supporting_evidence: string;
  sources: string[];
}

interface KeyFinding {
  finding: string;
  confidence: string;
  detail: string;
}

interface ResearchBriefData {
  topic: string;
  summary: string;
  key_findings: KeyFinding[];
  viewpoints: Viewpoint[];
  sources: Source[];
  conclusion: string;
}

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  High: { bg: "bg-emerald-500/15 border-emerald-500/20", text: "text-emerald-400", icon: Shield },
  Medium: { bg: "bg-amber-500/15 border-amber-500/20", text: "text-amber-400", icon: Info },
  Low: { bg: "bg-red-500/15 border-red-500/20", text: "text-red-400", icon: AlertTriangle },
};

export default function ResearchBriefView({ data }: { data: ResearchBriefData }) {
  const [expandedViewpoint, setExpandedViewpoint] = useState<number | null>(0);
  const [showAllSources, setShowAllSources] = useState(false);

  if (!data?.topic) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-fg">No research data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Topic & Summary */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-1">{data.topic}</h2>
        <div className="mt-4 text-sm text-muted-fg leading-relaxed whitespace-pre-line">
          {data.summary}
        </div>
      </div>

      {/* Key Findings */}
      {data.key_findings?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Key Findings</h3>
          <div className="space-y-3">
            {data.key_findings.map((finding, i) => {
              const style = CONFIDENCE_STYLES[finding.confidence] || CONFIDENCE_STYLES.Medium;
              const ConfIcon = style.icon;
              return (
                <div
                  key={i}
                  className={`rounded-xl border ${style.bg} p-4`}
                >
                  <div className="flex items-start gap-3">
                    <ConfIcon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground">{finding.finding}</p>
                        <span className={`text-xs font-semibold ${style.text} shrink-0`}>
                          {finding.confidence}
                        </span>
                      </div>
                      <p className="text-xs text-muted-fg leading-relaxed">{finding.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Viewpoints */}
      {data.viewpoints?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Perspectives & Viewpoints</h3>
          <div className="space-y-2">
            {data.viewpoints.map((vp, i) => {
              const isExpanded = expandedViewpoint === i;
              return (
                <div key={i} className="rounded-xl border border-border bg-muted/30">
                  <button
                    onClick={() => setExpandedViewpoint(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground pr-4">{vp.position}</p>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-fg shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-fg shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <p className="text-xs text-muted-fg leading-relaxed mb-3">
                        {vp.supporting_evidence}
                      </p>
                      {vp.sources?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {vp.sources.map((src, j) => (
                            <span
                              key={j}
                              className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-indigo-300"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conclusion */}
      {data.conclusion && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
          <h3 className="text-sm font-semibold text-indigo-300 mb-3">Conclusion</h3>
          <p className="text-sm text-muted-fg leading-relaxed whitespace-pre-line">
            {data.conclusion}
          </p>
        </div>
      )}

      {/* Sources */}
      {data.sources?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Sources ({data.sources.length})
            </h3>
            {data.sources.length > 4 && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                {showAllSources ? "Show less" : "Show all"}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(showAllSources ? data.sources : data.sources.slice(0, 4)).map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-card-hover hover:border-indigo-500/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-indigo-300 transition-colors truncate">
                    {source.title}
                  </p>
                  <p className="text-xs text-muted-fg mt-0.5 line-clamp-2">{source.snippet}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-fg opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
