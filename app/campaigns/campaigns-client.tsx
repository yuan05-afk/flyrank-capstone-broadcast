"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  publishedAt?: string | null;
  updatedAt?: string;
};

type Campaign = {
  id: string;
  title: string;
  body: string;
  url: string;
  posts: Post[];
  createdAt: string;
};

type PlatformSpec = {
  key: string;
  label: string;
  width: number;
  height: number;
  aspect: string;
  charBudget?: number;
};

type Toast = {
  id: number;
  tone: "info" | "success" | "error";
  title: string;
  detail?: string;
};

type ActivityEntry = {
  id: number;
  at: string;
  text: string;
  tone: "info" | "success" | "error";
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
  const cleaned = imagePath.replace(/^storage\/variants\//, "");
  return `/api/media/${cleaned}`;
}

function clockOf(value: string | number | Date) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function relativeRunAt(iso: string) {
  const delta = new Date(iso).getTime() - Date.now();
  if (delta <= 0) return "due now";
  const seconds = Math.round(delta / 1000);
  if (seconds < 60) return `in ${seconds}s`;
  return `in ${Math.round(seconds / 60)}m`;
}

export function CampaignsClient() {
  const shouldReduce = useReducedMotion();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [active, setActive] = useState<Campaign | null>(null);
  const [specs, setSpecs] = useState<Record<string, PlatformSpec>>({});
  const [form, setForm] = useState(sample);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [watching, setWatching] = useState(false);
  const [autoWorker, setAutoWorker] = useState(true);
  const [schedulePlatform, setSchedulePlatform] = useState("instagram");
  const [scheduleMinutes, setScheduleMinutes] = useState(0);

  const activeId = active?.id ?? null;
  const counter = useRef(0);
  const nextId = () => {
    counter.current += 1;
    return counter.current;
  };

  const log = useCallback((text: string, tone: ActivityEntry["tone"] = "info") => {
    setActivity((prev) =>
      [{ id: nextId(), at: clockOf(Date.now()), text, tone }, ...prev].slice(0, 40)
    );
  }, []);

  const notify = useCallback(
    (tone: Toast["tone"], title: string, detail?: string) => {
      const id = nextId();
      setToasts((prev) => [...prev, { id, tone, title, detail }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5200);
      log(detail ? `${title} - ${detail}` : title, tone);
    },
    [log]
  );

  const loadList = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (!res.ok) return [] as Campaign[];
    const data = await res.json();
    const list: Campaign[] = data.campaigns || [];
    setCampaigns(list);
    return list;
  }, []);

  const loadActive = useCallback(async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    setActive(data.campaign as Campaign);
    return data.campaign as Campaign;
  }, []);

  useEffect(() => {
    void loadList();
    void fetch("/api/platforms")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, PlatformSpec> = {};
        for (const spec of data.platforms || []) map[spec.key] = spec;
        setSpecs(map);
      })
      .catch(() => undefined);
  }, [loadList]);

  /** Poll the board while anything is mid-flight so status changes are visible. */
  useEffect(() => {
    if (!watching || !activeId) return;
    let cancelled = false;
    let ticks = 0;

    const timer = setInterval(async () => {
      ticks += 1;
      const campaign = await loadActive(activeId);
      await loadList();
      if (cancelled) return;

      const pending = (campaign?.posts || []).some((p) => p.status === "queued");
      if (!pending) {
        setWatching(false);
        const published = (campaign?.posts || []).filter((p) => p.status === "published");
        if (published.length) {
          notify(
            "success",
            "Signed delivery webhook received",
            `${published.map((p) => p.platform).join(", ")} now published`
          );
        }
      } else if (ticks >= 25) {
        setWatching(false);
        notify("error", "Still queued", "No delivery webhook arrived. Is pnpm dev:fake running?");
      }
    }, 1200);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [watching, activeId, loadActive, loadList, notify]);

  /** Durable worker heartbeat so scheduled jobs actually fire while you watch. */
  useEffect(() => {
    if (!autoWorker) return;
    const timer = setInterval(async () => {
      const res = await fetch("/api/worker/tick", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.processed) {
        log(`Worker claimed job ${data.jobId ?? ""} and published once`, "success");
        setWatching(true);
        if (activeId) await loadActive(activeId);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [autoWorker, activeId, loadActive, log]);

  async function createCampaign() {
    setBusy("create");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setActive(data.campaign);
      await loadList();
      notify(
        "success",
        "Campaign framed",
        `${data.campaign.posts.length} platform variants and captions rendered`
      );
    } catch (err) {
      notify("error", "Create failed", (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function publish(platform?: string) {
    if (!active) return;
    setBusy(platform ? `publish:${platform}` : "publish");
    try {
      const res = await fetch(`/api/campaigns/${active.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platform ? { platform } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "publish failed");
      setActive(data.campaign);

      for (const result of data.results || []) {
        if (result.error) {
          notify("error", `${result.platform} publish failed`, result.error);
        } else {
          notify(
            "info",
            `${result.platform} accepted by platform`,
            `remote id ${result.externalPostId}, waiting on signed webhook`
          );
        }
      }
      setWatching(true);
    } catch (err) {
      notify("error", "Publish failed", (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function schedule() {
    if (!active) return;
    setBusy("schedule");
    try {
      const runAt = new Date(Date.now() + scheduleMinutes * 60_000).toISOString();
      const res = await fetch(`/api/campaigns/${active.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: schedulePlatform, runAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "schedule failed");
      await loadActive(active.id);
      notify(
        "info",
        `Job queued for ${schedulePlatform}`,
        `durable job ${data.job.id}, runs ${relativeRunAt(runAt)}`
      );
      setWatching(true);
    } catch (err) {
      notify("error", "Schedule failed", (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function tickWorker() {
    setBusy("tick");
    try {
      const res = await fetch("/api/worker/tick", { method: "POST" });
      const data = await res.json();
      if (!data.processed) {
        notify("info", "Worker tick", "no job was due");
      } else if (data.error) {
        notify("error", "Worker tick failed", data.error);
      } else {
        notify("success", "Worker published a due job", `remote id ${data.externalPostId}`);
        setWatching(true);
      }
      if (active) await loadActive(active.id);
    } finally {
      setBusy(null);
    }
  }

  async function removeCampaign(id: string, title: string) {
    setBusy(`delete:${id}`);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      const list = await loadList();
      if (activeId === id) setActive(list[0] ?? null);
      notify("success", "Campaign removed", title);
    } catch (err) {
      notify("error", "Delete failed", (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  const pendingCount = (active?.posts || []).filter((p) => p.status === "queued").length;

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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={autoWorker}
                onChange={(e) => setAutoWorker(e.target.checked)}
                className="accent-broadcast"
              />
              Auto worker
            </label>
            <button className="btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="section-intro-badge mb-3">
              <span className="signal-status-dot" />
              Campaign desk
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Make a campaign</h1>
            <p className="text-sm text-muted mt-2 max-w-xl">
              Paste a published post. Broadcast writes captions, crops variants, and publishes
              through sandbox adapters.
            </p>
          </div>
          <Link href="/" className="btn-ghost self-start">
            ← Marketing
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-4 items-start">
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
            <button className="btn-primary w-full" disabled={busy !== null} onClick={createCampaign}>
              {busy === "create" ? (
                <>
                  <span className="bc-spinner" />
                  Rendering variants…
                </>
              ) : (
                "Make campaign"
              )}
            </button>

            <div className="border border-line rounded-xl p-3 bg-canvas/60">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-muted">
                  Activity
                </p>
                {watching && (
                  <span className="inline-flex items-center gap-2 text-[11px] text-broadcast">
                    <span className="bc-spinner" />
                    waiting on delivery
                  </span>
                )}
              </div>
              <ul className="bc-activity signal-scroll space-y-1.5 pr-1">
                {activity.length === 0 && (
                  <li className="text-xs text-muted">
                    Actions and webhook results appear here in real time.
                  </li>
                )}
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-2 text-[11px] leading-relaxed">
                    <span className="font-mono text-muted shrink-0">{entry.at}</span>
                    <span
                      className={
                        entry.tone === "error"
                          ? "text-danger"
                          : entry.tone === "success"
                            ? "text-ok"
                            : "text-ink/80"
                      }
                    >
                      {entry.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="lg:col-span-3 space-y-4">
            {!active && (
              <div className="surface p-8 text-center text-sm text-muted">
                No active campaign yet. Frame one from the form.
              </div>
            )}

            {active && (
              <div className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl border border-line overflow-hidden shrink-0 bg-canvas">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(`storage/variants/${active.id}/source.png`)}
                        alt="Master source image for this campaign"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                        One source · {active.posts.length} frames
                      </p>
                      <h2 className="font-display text-xl font-semibold truncate">
                        {active.title}
                      </h2>
                      <p className="text-[11px] text-muted">
                        {pendingCount > 0
                          ? `${pendingCount} awaiting signed delivery`
                          : "all platforms settled"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !text-sm" disabled={busy !== null} onClick={() => publish()}>
                      {busy === "publish" ? <span className="bc-spinner" /> : null}
                      Publish all
                    </button>
                    <button
                      className="rounded-xl border border-line px-3 py-2 text-sm font-semibold hover:border-broadcast/40 disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={tickWorker}
                    >
                      Tick worker
                    </button>
                    <button
                      className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-danger hover:border-danger/40 disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => removeCampaign(active.id, active.title)}
                    >
                      Delete
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
                      {active.posts.map((p) => (
                        <option key={p.platform} value={p.platform}>
                          {p.platform}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted">
                    Run in (minutes)
                    <input
                      type="number"
                      min={0}
                      className="input-field !mt-1 w-28"
                      value={scheduleMinutes}
                      onChange={(e) => setScheduleMinutes(Number(e.target.value) || 0)}
                    />
                  </label>
                  <button
                    className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold hover:border-broadcast/40 disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={schedule}
                  >
                    Queue
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {active.posts.map((post, i) => {
                    const spec = specs[post.platform];
                    const ratio = spec ? `${spec.width} / ${spec.height}` : "1 / 1";
                    const overBudget =
                      spec?.charBudget != null && post.caption.length > spec.charBudget;
                    return (
                      <motion.article
                        key={post.id}
                        className="border border-line rounded-2xl overflow-hidden bg-surface"
                        initial={shouldReduce ? {} : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="bc-frame" style={{ aspectRatio: ratio }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`${mediaUrl(post.imagePath)}?v=${post.updatedAt ?? ""}`}
                            alt={`${post.platform} variant rendered at ${spec?.width ?? ""}x${spec?.height ?? ""}`}
                          />
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-broadcast">
                              {post.platform} {spec ? `· ${spec.aspect}` : ""}
                            </span>
                            <span className={`${statusBadge(post.status)} gap-1.5`}>
                              {post.status === "queued" && <span className="bc-spinner" />}
                              {post.status}
                            </span>
                          </div>

                          <p className="font-mono text-[9px] text-muted">
                            {spec ? `${spec.width}x${spec.height}px` : ""}
                            {spec?.charBudget != null && (
                              <span className={overBudget ? "text-danger" : ""}>
                                {" "}
                                · {post.caption.length}/{spec.charBudget} chars
                              </span>
                            )}
                          </p>

                          <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto signal-scroll pr-1">
                            {post.caption}
                          </p>

                          <dl className="text-[9px] font-mono text-muted space-y-0.5">
                            <div className="truncate">key {post.idempotencyKey}</div>
                            {post.externalPostId && (
                              <div className="truncate">remote {post.externalPostId}</div>
                            )}
                            {post.scheduledFor && post.status === "queued" && (
                              <div>runs {relativeRunAt(post.scheduledFor)}</div>
                            )}
                            {post.publishedAt && (
                              <div className="text-ok">delivered {clockOf(post.publishedAt)}</div>
                            )}
                          </dl>

                          {post.lastError && (
                            <p className="text-[11px] text-danger">{post.lastError}</p>
                          )}

                          <button
                            className="text-xs font-semibold text-broadcast hover:underline disabled:opacity-50"
                            onClick={() => publish(post.platform)}
                            disabled={busy !== null}
                          >
                            {busy === `publish:${post.platform}`
                              ? "Publishing…"
                              : "Publish this platform"}
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="surface p-5">
          <h3 className="font-display font-semibold mb-3">Recent campaigns</h3>
          <div className="space-y-2">
            {campaigns.map((c) => {
              const published = c.posts.filter((p) => p.status === "published").length;
              return (
                <div
                  key={c.id}
                  data-campaign-id={c.id}
                  className={`flex items-center gap-3 border rounded-xl px-3 py-2 transition-colors ${
                    activeId === c.id ? "border-broadcast/50 bg-broadcast-fog/30" : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => void loadActive(c.id)}
                  >
                    <span className="font-medium text-sm block truncate">{c.title}</span>
                    <span className="font-mono text-[10px] text-muted">
                      {clockOf(c.createdAt)} · {published}/{c.posts.length} published
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-danger disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() => removeCampaign(c.id, c.title)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
            {campaigns.length === 0 && <p className="text-sm text-muted">No campaigns yet.</p>}
          </div>
        </section>
      </div>

      <div className="bc-toast-stack">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`bc-toast bc-toast--${toast.tone}`}
            initial={shouldReduce ? {} : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="min-w-0">
              <p className="font-semibold">{toast.title}</p>
              {toast.detail && (
                <p className="text-muted text-[11px] leading-relaxed break-words">{toast.detail}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
