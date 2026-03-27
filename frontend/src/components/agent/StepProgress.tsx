"use client";

import { StepStatus } from "../../types";
import { Check, Loader2, Circle } from "lucide-react";

interface StepProgressProps {
  steps: StepStatus[];
  currentStep: number;
  stepMessage: string;
}

export default function StepProgress({ steps, currentStep, stepMessage }: StepProgressProps) {
  if (!steps.length) return null;

  return (
    <div className="w-full animate-fade-in">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Progress</h3>
          <span className="text-xs text-muted-fg tabular-nums">
            {currentStep} / {steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        {/* Step list */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.status === "completed" ? (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              ) : step.status === "in_progress" ? (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15">
                  <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                </div>
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Circle className="h-3 w-3 text-muted-fg/40" />
                </div>
              )}
              <span
                className={`text-sm ${
                  step.status === "completed"
                    ? "text-foreground"
                    : step.status === "in_progress"
                      ? "text-foreground font-medium"
                      : "text-muted-fg"
                }`}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>

        {/* Current message */}
        {stepMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse-dot" />
            <span className="text-xs text-indigo-300">{stepMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
