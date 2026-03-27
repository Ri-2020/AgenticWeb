"use client";

import { Job, ShoppingRecommendations } from "../../types";
import ProductGrid from "./ProductGrid";
import ResearchBriefView from "./ResearchBrief";
import TripItineraryView from "./TripItinerary";

interface ResultRendererProps {
  job: Job;
  outputType: string;
}

export default function ResultRenderer({ job, outputType }: ResultRendererProps) {
  if (job.status === "failed") {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center animate-fade-in">
        <p className="font-medium text-red-400">Something went wrong</p>
        <p className="mt-1 text-sm text-red-400/70">{job.error || "Please try again"}</p>
      </div>
    );
  }

  if (job.status !== "completed" || !job.results) return null;

  if (outputType === "product_grid") {
    return <ProductGrid data={job.results as unknown as ShoppingRecommendations} />;
  }

  if (outputType === "research_brief") {
    return <ResearchBriefView data={job.results as never} />;
  }

  if (outputType === "trip_itinerary") {
    return <TripItineraryView data={job.results as never} />;
  }

  // Generic JSON fallback
  return (
    <div className="rounded-2xl border border-border bg-card p-6 animate-fade-in">
      <h3 className="mb-3 text-sm font-semibold">Results</h3>
      <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs text-muted-fg">
        {JSON.stringify(job.results, null, 2)}
      </pre>
    </div>
  );
}
