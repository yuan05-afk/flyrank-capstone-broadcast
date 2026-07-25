"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLockup } from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("broadcast_demo_key_001");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      // Keep the busy state until the campaigns route takes over.
      router.push("/campaigns");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen hero-mesh flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <BrandLockup />
      </header>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <form onSubmit={onSubmit} className="surface w-full max-w-md p-7">
          <h1 className="font-display text-2xl font-semibold mb-1">
            Sign in to Broadcast
          </h1>
          <p className="text-sm text-muted mb-6">
            Use the demo API key. Prefills are ready for review.
          </p>
          <label className="block text-sm font-medium mb-5">
            <span className="text-muted">API key</span>
            <input
              className="input-field font-mono text-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
          </label>
          {error && <p className="badge badge-danger mb-4 !normal-case">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <>
                <span className="bc-spinner" />
                Opening studio…
              </>
            ) : (
              "Continue"
            )}
          </button>
          <p className="mt-4 text-xs text-muted">Demo: broadcast_demo_key_001</p>
          <p className="mt-3 text-xs">
            <Link href="/" className="text-broadcast hover:underline">
              ← Back to home
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
