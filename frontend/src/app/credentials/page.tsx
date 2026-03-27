"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "../../lib/auth";
import { auth } from "../../lib/firebase";
import { saveGeminiKey } from "../../lib/jobs";
import Navbar from "../../components/Navbar";
import { Key, ShieldCheck } from "lucide-react";

export default function CredentialsPage() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setStatus(null);
    try {
      const token = await auth.currentUser!.getIdToken();
      await saveGeminiKey(token, apiKey.trim());
      setStatus("Saved. Your requests will now use your Gemini key.");
      setApiKey("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-400/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar user={user} showBack backLabel="Back" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
                <Key className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">API Keys</h2>
                <p className="text-sm text-muted-fg">Bring your own Gemini key</p>
              </div>
            </div>

            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Each account can run <strong>3 jobs/day</strong>. Your Gemini key is still encrypted and used for
                request execution.
              </p>
            </div>

            <label className="block text-sm font-medium text-foreground mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key"
              className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-fg/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
            />

            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || saving}
              className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving ? "Saving..." : "Save API Key"}
            </button>

            {status && (
              <p className="mt-3 text-sm text-emerald-400 animate-fade-in">{status}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
