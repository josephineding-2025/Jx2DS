"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAsAction } from "./actions";

const PRESET_USERS = [
  { key: "jinseng", name: "Jin Seng", emoji: "🐉" },
  { key: "josephine", name: "Josephine", emoji: "🌺" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function handleSignIn(userKey: string) {
    setError(null);
    setLoadingKey(userKey);

    const result = await signInAsAction(userKey);

    if (result && "error" in result) {
      setError(result.error);
      setLoadingKey(null);
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A14] px-4">
      <section className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#16162A] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            SnapIt
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            Choose who you are to continue
          </p>
        </div>

        <div className="space-y-3">
          {PRESET_USERS.map((user) => (
            <button
              key={user.key}
              type="button"
              disabled={loadingKey !== null}
              onClick={() => handleSignIn(user.key)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0A0A14] px-4 py-3.5 text-left transition hover:border-[#7C3AED]/50 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED]/20 text-lg">
                {user.emoji}
              </span>
              <span className="text-sm font-medium text-white">
                {user.name}
              </span>
              {loadingKey === user.key && (
                <span className="ml-auto text-xs text-[#9CA3AF]">
                  Signing in...
                </span>
              )}
            </button>
          ))}
        </div>

        <p
          className="mt-4 min-h-5 text-center text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error ?? ""}
        </p>
      </section>
    </main>
  );
}
