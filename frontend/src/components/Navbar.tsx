"use client";

import { User } from "firebase/auth";
import { signInWithGoogle, signOut } from "../lib/auth";
import Link from "next/link";
import { Bot, LogOut, Key, ChevronLeft, Info } from "lucide-react";

interface NavbarProps {
  user: User | null;
  showBack?: boolean;
  backLabel?: string;
}

export default function Navbar({ user, showBack, backLabel }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link
              href="/agents"
              className="flex items-center gap-1 text-sm text-muted-fg hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel || "Agents"}
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight">AgentHub</span>
            </Link>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Link
            href="/about"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-fg hover:text-foreground hover:bg-muted transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">About</span>
          </Link>
          {user ? (
            <>
              <Link
                href="/credentials"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-fg hover:text-foreground hover:bg-muted transition-colors"
              >
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">API Keys</span>
              </Link>
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-7 w-7 rounded-full ring-1 ring-border"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="hidden sm:inline text-sm text-muted-fg">
                  {user.displayName?.split(" ")[0]}
                </span>
                <button
                  onClick={() => signOut()}
                  className="rounded-lg p-1.5 text-muted-fg hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-card-hover transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
