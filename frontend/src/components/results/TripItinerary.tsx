"use client";

import { ExternalLink, MapPin, Clock, Lightbulb, Utensils, Bed, Wallet } from "lucide-react";
import { useState } from "react";

interface Activity {
  time: string;
  activity: string;
  location: string;
  estimated_cost: string;
  tip: string;
}

interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
}

interface Accommodation {
  name: string;
  type: string;
  price_per_night: string;
  location: string;
  url: string;
  reason: string;
}

interface FoodSpot {
  name: string;
  cuisine: string;
  price_range: string;
  meal_type: string;
  must_try: string;
}

interface BudgetItem {
  category: string;
  estimated_cost: string;
  notes: string;
}

interface TripItineraryData {
  destination: string;
  duration: string;
  travel_style: string;
  summary: string;
  daily_plans: DayPlan[];
  accommodations: Accommodation[];
  food_spots: FoodSpot[];
  budget: BudgetItem[];
  total_estimated_cost: string;
  pro_tips: string[];
}

type Tab = "itinerary" | "stays" | "food" | "budget";

export default function TripItineraryView({ data }: { data: TripItineraryData }) {
  const [activeTab, setActiveTab] = useState<Tab>("itinerary");
  const [expandedDay, setExpandedDay] = useState<number>(1);

  if (!data?.destination) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-fg">No trip data available.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "itinerary", label: "Itinerary", icon: MapPin },
    { id: "stays", label: "Stays", icon: Bed },
    { id: "food", label: "Food", icon: Utensils },
    { id: "budget", label: "Budget", icon: Wallet },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.destination}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {data.duration}
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                {data.travel_style}
              </span>
            </div>
          </div>
          {data.total_estimated_cost && (
            <div className="text-right">
              <p className="text-xs text-muted-fg">Total Estimated</p>
              <p className="text-lg font-bold text-emerald-400">{data.total_estimated_cost}</p>
            </div>
          )}
        </div>
        {data.summary && (
          <p className="mt-4 text-sm text-muted-fg leading-relaxed">{data.summary}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                : "text-muted-fg hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Itinerary Tab */}
      {activeTab === "itinerary" && data.daily_plans?.length > 0 && (
        <div className="space-y-3">
          {data.daily_plans.map((day) => {
            const isExpanded = expandedDay === day.day;
            return (
              <div key={day.day} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? -1 : day.day)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-card-hover transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-400">
                    {day.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{day.title}</p>
                    <p className="text-xs text-muted-fg">{day.activities?.length || 0} activities</p>
                  </div>
                </button>
                {isExpanded && day.activities && (
                  <div className="border-t border-border px-5 py-4 space-y-4 animate-fade-in">
                    {day.activities.map((act, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-mono text-indigo-400 whitespace-nowrap">{act.time}</span>
                          {i < day.activities.length - 1 && (
                            <div className="flex-1 w-px bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-foreground">{act.activity}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {act.location}
                            </span>
                            {act.estimated_cost && (
                              <span className="text-emerald-400">{act.estimated_cost}</span>
                            )}
                          </div>
                          {act.tip && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15 px-2.5 py-1.5">
                              <Lightbulb className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                              <span className="text-xs text-amber-300/80">{act.tip}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stays Tab */}
      {activeTab === "stays" && data.accommodations?.length > 0 && (
        <div className="space-y-3">
          {data.accommodations.map((stay, i) => (
            <a
              key={i}
              href={stay.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 hover:bg-card-hover hover:border-indigo-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground group-hover:text-indigo-300 transition-colors">
                    {stay.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5">{stay.type}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{stay.location}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-emerald-400">{stay.price_per_night}</p>
                  <p className="text-xs text-muted-fg">/night</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-fg">{stay.reason}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                View listing <ExternalLink className="h-3 w-3" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Food Tab */}
      {activeTab === "food" && data.food_spots?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.food_spots.map((spot, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{spot.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                    <span>{spot.cuisine}</span>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5">{spot.meal_type}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-400 shrink-0">{spot.price_range}</span>
              </div>
              {spot.must_try && (
                <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-300/80">
                  <span className="shrink-0">Must try:</span>
                  <span className="text-muted-fg">{spot.must_try}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === "budget" && data.budget?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {data.budget.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.category}</p>
                  {item.notes && <p className="text-xs text-muted-fg mt-0.5">{item.notes}</p>}
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">{item.estimated_cost}</span>
              </div>
            ))}
          </div>
          {data.total_estimated_cost && (
            <div className="flex items-center justify-between px-5 py-4 bg-indigo-500/10 border-t border-indigo-500/20">
              <span className="text-sm font-semibold text-indigo-300">Total Estimated</span>
              <span className="text-lg font-bold text-emerald-400">{data.total_estimated_cost}</span>
            </div>
          )}
        </div>
      )}

      {/* Pro Tips */}
      {data.pro_tips?.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Pro Tips
          </h3>
          <ul className="space-y-2">
            {data.pro_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-fg">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
