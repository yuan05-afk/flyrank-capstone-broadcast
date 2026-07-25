"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BrandLockup } from "@/components/BrandMark";

type Post = {
  id: string;
  platform: string;
  caption: string;
  imagePath: string;
  status: string;
  idempotencyKey: string;
  externalPostId?: string | null;
  scheduledFor?: string | null;
  lastError?: string | null;
};

type Campaign = {
  id: string;
  title: string;
  body: string;
  url: string;
  posts: Post[];
  createdAt: string;
};

const sample = {
  title: "Why safe-zone crops matter for social campaigns",
  body: "A single master image rarely survives every platform. Broadcast keeps the subject inside each crop so Instagram squares and X wides still feel intentional.",
  url: "https://example.com/blog/safe-zone-crops",
};

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "published") return "badge badge-ok";
  if (s === "failed") return "badge badge-danger";
  if (s === "queued") return "badge badge-warn";
  return "badge badge-muted";
}

function mediaUrl(imagePath: string) {
  // storage/variants/<id>/<file>.png -> /api/media/<id>/<file>.png
  const cleaned = imagePath.replace(/^storage\/variants\//, "");
  return `/api/media/${cleaned}`;
}

export function CampaignsClient() {
  const shouldReduce = useReducedMotion();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [active, setActive] = useState<Campaign | null>(null);
  const [form, setForm] = useState(sample);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulePlatform, setSchedulePlatform] = useState("instagram");
  const [scheduleMinutes, setScheduleMinutes] = useState(0);

  async function refresh() {
    const res = await fetch("/api/campaigns");
    if (!res.ok) return;
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    if (active) {
      const next = (data.campaigns || []).find(
        (c: Campaign) => c.id === active.id
      );
      if (next) setActive(next);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCampaign() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setActive(data.campaign);
      setMessage("Campaign framed with captions and variants.");
      await refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function publish(platform?: string) {
    if (!active) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${active.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform ? { platform } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "publish failed");
      setActive(data.campaign);
      setMessage("Publish requested - waiting on signed delivery webhook.");
      setTimeout(() => void refreshActive(active.id), 500);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshActive(id: string) {
    const res = await fetch(`/api/campaigns/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setActive(data.campaign);
    await refresh();
  }

  async function schedule() {
    if (!active) return;
    setBusy(true);
    try {
      const runAt = new Date(Date.now() + scheduleMinutes * 60_000).toISOString();
      const res = await fetch(`/api/campaigns/${active.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: schedulePlatform, runAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "schedule failed");
      setMessage(`Queued ${schedulePlatform} for ${runAt}`);
      await refreshActive(active.id);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function tickWorker() {
    setBusy(true);
    try {
      const res = await fetch("/api/worker/tick", { method: "POST" });
      const data = await res.json();
      setMessage(`Worker tick: ${JSON.stringify(data)}`);
      if (active) await refreshActive(active.id);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen hero-mesh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLockup href="/" />
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-broadcast/20 bg-broadcast-fog/60 px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] uppercase text-broadcast">
              <span className="signal-status-dot" />
              Live studio
            </span>
          </div>
          <button className="btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="section-intro-badge mb-3">
              <span className="signal-status-dot" />
              Campaign desk
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Make a campaign
            </h1>
            <p className="text-sm text-muted mt-2 max-w-xl">
              Paste a published post. Broadcast writes captions, crops variants,
              and publishes through sandbox adapters.
            </p>
          </div>
          <Link href="/" className="btn-ghost self-start">
            ← Marketing
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          <section className="surface p-5 lg:col-span-2 space-y-3">
            <label className="block text-sm">
              <span className="text-muted">Title</span>
              <input
                className="input-field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Body</span>
              <textarea
                className="input-field min-h-[120px]"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">URL</span>
              <input
                className="input-field font-mono text-xs"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </label>
            <button
              className="btn-primary w-full"
              disabled={busy}
              onClick={createCampaign}
            >
              {busy ? "Working…" : "Make campaign"}
            </button>
            {message && (
              <p className="text-xs text-muted leading-relaxed border border-line rounded-xl px-3 py-2 bg-canvas">
                {message}
              </p>
            )}
          </section>

          <section className="lg:col-span-3 space-y-4">
            {!active && (
              <div className="surface p-8 text-center text-sm text-muted">
                No active campaign yet. Frame one from the form.
              </div>
            )}

            {active && (
              <>
                <div className="surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                        Campaign
                      </p>
                      <h2 className="font-display text-xl font-semibold">
                        {active.title}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-primary !text-sm"
                        disabled={busy}
                        onClick={() => publish()}
                      >
                        Publish all
                      </button>
                      <button
                        className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-broadcast/40"
                        disabled={busy}
                        onClick={tickWorker}
                      >
                        Tick worker
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2 mb-4">
                    <label className="text-xs text-muted">
                      Platform
                      <select
                        className="input-field !mt-1"
                        value={schedulePlatform}
                        onChange={(e) => setSchedulePlatform(e.target.value)}
                      >
                        <option value="instagram">instagram</option>
                        <option value="x">x</option>
                      </select>
                    </label>
                    <label className="text-xs text-muted">
                      Run in (minutes)
                      <input
                        type="number"
                        min={0}
                        className="input-field !mt-1 w-28"
                        value={scheduleMinutes}
                        onChange={(e) =>
                          setScheduleMinutes(Number(e.target.value) || 0)
                        }
                      />
                    </label>
                    <button
                      className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-broadcast/40"
                      disabled={busy}
                      onClick={schedule}
                    >
                      Queue
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {active.posts.map((post, i) => (
                      <motion.article
                        key={post.id}
                        className="border border-line rounded-2xl overflow-hidden bg-canvas/60"
                        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl(post.imagePath)}
                          alt={`${post.platform} variant`}
                          className="w-full aspect-video object-cover bg-ink/5"
                        />
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-broadcast">
                              {post.platform}
                            </span>
                            <span className={statusBadge(post.status)}>
                              {post.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted leading-relaxed line-clamp-4 whitespace-pre-wrap">
                            {post.caption}
                          </p>
                          <p className="font-mono text-[9px] text-muted truncate">
                            key {post.idempotencyKey}
                          </p>
                          <button
                            className="text-xs font-semibold text-broadcast hover:underline"
                            onClick={() => publish(post.platform)}
                            disabled={busy}
                          >
                            Publish this platform
                          </button>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        <section className="surface p-5">
          <h3 className="font-display font-semibold mb-3">Recent campaigns</h3>
          <div className="space-y-2">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                data-campaign-id={c.id}
                className="w-full text-left border border-line rounded-xl px-3 py-2 hover:border-broadcast/35 transition-colors"
                onClick={() => setActive(c)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm">{c.title}</span>
                  <span className="font-mono text-[10px] text-muted">
                    {c.posts.length} platforms
                  </span>
                </div>
              </button>
            ))}
            {campaigns.length === 0 && (
              <p className="text-sm text-muted">No campaigns yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
