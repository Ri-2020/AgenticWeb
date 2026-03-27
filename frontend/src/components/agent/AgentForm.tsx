"use client";

import { useState } from "react";
import { InputField } from "../../types";
import { Send, Loader2 } from "lucide-react";

interface AgentFormProps {
  inputFields: InputField[];
  onSubmit: (values: Record<string, string>) => void;
  isLoading: boolean;
  disabled?: boolean;
  accentColor?: string;
}

export default function AgentForm({ inputFields, onSubmit, isLoading, disabled = false, accentColor }: AgentFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const field of inputFields) {
      init[field.name] = field.default || "";
    }
    return init;
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const isRequiredField = (field: InputField) =>
    field.name === "query" ||
    field.required === true ||
    String(field.required).toLowerCase() === "true";

  const hasRequiredValues = inputFields
    .filter(isRequiredField)
    .every((f) => (values[f.name] || "").trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (!hasRequiredValues) {
      setValidationError("Please enter your query before submitting.");
      return;
    }
    setValidationError(null);
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all">
        {inputFields.map((field) => {
          if (field.type === "select") {
            return (
              <div key={field.name} className="px-3 py-1">
                <select
                  value={values[field.name]}
                  onChange={(e) => {
                    setValidationError(null);
                    setValues({ ...values, [field.name]: e.target.value });
                  }}
                  disabled={isLoading || disabled}
                  className="w-full bg-transparent text-sm text-muted-fg focus:outline-none disabled:opacity-50 cursor-pointer"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt} className="bg-card text-foreground">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={field.name} className="flex items-center gap-2">
              <input
                type="text"
                value={values[field.name]}
                onChange={(e) => {
                  setValidationError(null);
                  setValues({ ...values, [field.name]: e.target.value });
                }}
                placeholder={field.placeholder || field.label}
                disabled={isLoading || disabled}
                className="flex-1 px-4 py-3 text-base bg-transparent text-foreground focus:outline-none disabled:opacity-50 placeholder:text-muted-fg/50"
              />
              <button
                type="submit"
                disabled={
                  disabled ||
                  isLoading ||
                  !hasRequiredValues
                }
                className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm disabled:opacity-40 transition-all cursor-pointer hover:shadow-md"
                style={{ backgroundColor: accentColor || "#6366f1" }}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      {validationError && (
        <p className="mt-2 text-sm text-amber-300">{validationError}</p>
      )}
    </form>
  );
}
