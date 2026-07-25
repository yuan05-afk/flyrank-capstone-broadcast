# CURSOR PROMPT - Social Media Studio (Broadcast)

**Capstone · Backend AI Engineering · Week 9 · ~24h workload**

You are building **Broadcast**, a Social Media Studio Capstone under
`FlyRankAI/Capstones/Social Media Studio`.

Take one published blog post and turn it into a multi-platform social campaign:
generate the right image variant for each platform, write a platform-tailored
caption, then publish through a clean adapter layer - scheduled, idempotent,
rate-limit-aware, and status-tracked. Built against a provided **fake-platform
server**, so no code ever touches a live social account for the core build.

---

## Non-negotiables (read before writing any code)

1. **Sandbox-first.** Core publish path targets the fake platform only
   (`starters/challenge-5-social/` or a faithful local stand-in if that path is
   missing from this machine). No live Instagram / X / LinkedIn calls for core.
   No shared credentials. No committed tokens. Real posting is opt-in stretch
   with a personal sandbox app only.
2. **Skills (mandatory).** Before scaffolding UI or shipping, read and follow:
   - `Capstones/.cursor/skills/capstone-signal-design/SKILL.md` - shared Capstones
     harness (Lenis, Framer Motion, L/R hero, interactivity, scrollbars, pitch
     README, screenshots, staged git commits, public repo, `SUBMISSION.md`,
     no em dashes).
   - `Capstones/.cursor/skills/capstone-broadcast-design/SKILL.md` - **this
     product's** visual system (Broadcast Frame: rose accent, Syne + Figtree,
     crop-frame brand mark). Overrides palette/mark only. Do **not** reuse
     Checkpoint Signal teal.
   - If present, `~/.cursor/skills/flyrank-assignment/SKILL.md` for submission
     portal field rules.
3. **Every Capstone looks different.** Broadcast must not read as a teal
   Checkpoint clone. Same layout discipline, new colors and metaphor.
4. **No placeholder plumbing.** Endpoints against a real local DB. Adapters
   against the fake server. Tests must be runnable.
5. **Never fabricate "it works."** If a test fails, fix it. Do not paper over
   it in the README.
6. **Architecture:** `repository -> service -> route handler` (or equivalent clear
   layers). App code depends on `SocialPublisher`, never on a vendor SDK class.
7. **Copy:** no em dashes or en dashes in UI, README, or docs.

---

## Goal (one sentence)

A reviewer can start from a blog post, hit **Make campaign**, see distinct
images and captions per platform, schedule one for later, advance time, watch a
durable worker publish once, prove idempotency and 429 backoff, reject a forged
webhook, accept a valid one, and see a green campaign board - without touching
any real social account.

---

## Objectives (you will be able to)

1. Build a **publish-adapter layer** - one interface, multiple platform
   implementations; the app never coupled to a vendor SDK.
2. Make publishing **safe** - idempotent posts (retry never double-posts),
   rate-limit handling (`429` / `Retry-After`), encrypted tokens at rest.
3. **Schedule durable work** - post at a chosen time; survive a crash mid-batch
   without double-posting.
4. **Verify signed webhooks** - flip status `queued -> published | failed` only
   on a trusted delivery callback.

FlyRank has raw materials (platform prompts, image pipeline ideas, status shape)
but no actual publishing. You build the part that does not exist.

---

## Stack (prefer this unless blocked - say why if you drift)

- **Runtime:** Node.js + TypeScript
- **App:** Next.js 14 App Router (or FastAPI if the rest of the intern lane is
  Python-only - prefer Next.js so marketing + campaign UI share one repo like
  Checkpoint)
- **DB:** SQLite via Prisma (Postgres-ready one-line datasource swap)
- **Validation:** Zod at every public boundary
- **Jobs:** durable in-process or file/SQLite-backed queue with resumable workers
  (mirror A9 patterns). Do not require Redis for core.
- **Tests:** Vitest (or pytest if Python)
- **Package manager:** pnpm for Node
- **Fake platform:** `starters/challenge-5-social/` (OAuth, 429 + Retry-After,
  idempotency keys, signed delivery webhook). If the starter is not on disk,
  implement a minimal compatible fake server under `fake-platform/` that matches
  those behaviors and document the contract in `docs/FAKE_PLATFORM.md`.

---

## Skills + design direction

### Shared harness (`capstone-signal-design`)

Apply end to end: pitch landing, Lenis, motion, L/R hero, hover/focus,
scrollbars, README pitch style, `docs/images/` screenshots, phase commits,
`gh repo create`, `SUBMISSION.md`.

### Product look (`capstone-broadcast-design`)

Product name: **Broadcast**. Metaphor: crop frame + live corner.

| Token | Hex |
|-------|-----|
| Canvas | `#F7F8FC` |
| Surface | `#FFFFFF` |
| Ink | `#101828` |
| Muted | `#667085` |
| Line | `#E4E7EC` |
| Primary | `#E11D48` |
| Bright | `#FB7185` |
| Fog | `#FFE4E8` |

Fonts: **Syne** (display) + **Figtree** (body) + **IBM Plex Mono** (chips).

Landing chapters stay Capstones-shaped. Campaign dashboard may add:

- Campaign board (per-platform row: thumb, caption, status)
- Aspect preview rail (`1:1`, `16:9`, …)
- Minimal schedule strip
- Adapter health chips (idempotency, last 429, webhook verify)

Hero stays brand-first - no stats dump in the first viewport.

Write `docs/DESIGN.md` and `.cursor/rules/design.mdc` pointing at
`capstone-broadcast-design` (and the harness skill).

---

## What you will build

Given a published post (`title` + `body` + `url`), a service that:

1. **Image variants** from one source: correct dimensions / aspect ratio per
   platform, subject in the safe-zone, optional brand overlay. Generating a
   source image with a model is encouraged; the graded core is the **variant
   pipeline** (resize/crop of a placeholder is fine).
2. **Platform-tailored captions** by composing prompts from **fragments**
   (shared + platform-specific). No copy-pasted near-identical prompts.
   Prefer FlyRank `config/social-prompts.config.ts` patterns if available;
   otherwise create `config/social-prompts.config.ts` with fragment composition.
3. **Publish** through one `SocialPublisher` interface with **≥2** adapters
   against the fake server: encrypted OAuth token, idempotent publish, 429
   handling, retries with backoff.
4. **Schedule** posts via a durable job; track status
   `queued -> published | failed` updated by a **signature-verified** delivery
   webhook.
5. **Validated API** + a tiny **campaign view** (Broadcast UI).

### Core platforms (realistic scope)

Two platforms are enough for core:

| Platform key | Aspect | Caption voice (example) |
|--------------|--------|-------------------------|
| `instagram` | 1:1 | Visual-first, short, emoji-light |
| `x` | 16:9 (or 16:9 card / 1.91:1 link style - pick one and document) | Punchy, link-aware, character-budgeted |

Stretch may add LinkedIn (4:5 or 1.91:1) later.

---

## Architecture sketch

```
[blog post]
   ├─► caption composer (fragments) ─► per-platform captions
   └─► image variant pipeline ───────► per-platform images (sized, safe-zone)

schedule?
   └─► durable queue ─(worker, at time)─► SocialPublisher interface
                                            ├─► InstagramAdapter (fake)
                                            └─► XAdapter (fake)
                                         idempotency key · 429/Retry-After
                                         · encrypted token

publish to FAKE PLATFORM
   └─► signed delivery webhook ─► status: queued -> published | failed
```

### Suggested layout

```
app/ or src/
  api/                 route handlers (Zod in, JSON out)
  services/            campaign, caption, variant, publish orchestration
  publishers/          SocialPublisher + platform adapters
  repositories/        Prisma access only
  workers/             scheduler / resume logic
lib/
  crypto/              token encrypt/decrypt (random IV)
  webhooks/            signature verify
config/
  social-prompts.config.ts
  platform-specs.ts    sizes, safe-zones, voice ids
fake-platform/         if starter missing
prisma/
tests/
docs/
fixtures/              sample blog post JSON
public/
```

---

## Data model (minimum)

Mirror FlyRank `SocialPostEntry` / `ContentSocials` shapes where possible:

- `Campaign` - source post snapshot, createdAt
- `SocialPost` - campaignId, platform, caption, imagePath, status, idempotencyKey,
  externalPostId?, scheduledFor?, lastError?, publishedAt?
- `PlatformCredential` - platform, encryptedToken, iv, updatedAt
- `Job` / queue rows - type, runAt, attempts, lockedAt, doneAt (crash-safe)

Status enum: `draft | queued | published | failed` (core uses queued/published/failed).

---

## `SocialPublisher` interface (design this in Phase 0)

```ts
export interface PublishInput {
  platform: string;
  caption: string;
  imagePath: string;
  idempotencyKey: string; // stable for (campaignId, platform) or (post, platform)
}

export interface PublishResult {
  externalPostId: string;
  status: "queued" | "published";
}

export interface SocialPublisher {
  readonly platform: string;
  publish(input: PublishInput): Promise<PublishResult>;
}
```

App services accept `SocialPublisher` (or a registry), never a concrete vendor.

Tokens: encrypt at rest with a **random IV per write** (mirror
`lib/serverUtils.ts` patterns). Never log plaintext tokens.

---

## Definition of done (core)

- [ ] **Image variants:** correctly sized per platform; subject in safe-zone;
      automated test asserts dimensions. (M6)
- [ ] **Tailored captions** from shared + platform-specific fragments
      (no near-identical copy-paste prompts). (M6)
- [ ] **Adapter layer:** one `SocialPublisher`, ≥2 implementations; app depends
      on the interface. Token encrypted at rest (random IV). (M7)
- [ ] **Idempotent publish:** same `(post, platform)` twice - or retry after
      timeout - yields one post (idempotency key). (M3)
- [ ] **Rate-limit aware:** on `429`, honor `Retry-After` and back off.
      (M3, M7)
- [ ] **Scheduling:** durable, resumable worker; crash mid-batch resumes without
      double-posting. (M5)
- [ ] **Status via webhook:** signature-verified; forgeries rejected `400`;
      flips status into a `SocialPostEntry`-shaped record. (M3, M7)
- [ ] **Tests:** dimensions; idempotent dup -> one; forged webhook rejected;
      429 respected. (M10)
- [ ] **README + diagram** (pitch style from harness). All against fake server.
- [ ] **Broadcast UI** from `capstone-broadcast-design` + harness motion/docs.
- [ ] Public GitHub repo, phase commits, screenshots, `SUBMISSION.md`.

---

## Build phases (commit after each)

Name commits `Phase N: …` like other Capstones.

### Phase 0 - Contracts & design (~2h)

- Scaffold app, Prisma schema, `.env.example`, `.gitignore`
- `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `.cursor/rules/{architecture,security,design}.mdc`
- `config/platform-specs.ts` (sizes, safe-zones, voice ids)
- `SocialPublisher` interface + data model
- Wire Broadcast tokens / fonts / BrandMark stub
- Checkpoint: schema pushes; design docs exist

### Phase 1 - Caption composer + image variants (~4h)

- Fragment-based caption composition -> per-platform strings (persist artifacts)
- Variant pipeline: source -> resized/cropped per platform into `storage/variants/`
- Safe-zone crop documented
- Tests: output dimensions match specs
- Checkpoint: fixtures produce two captions + two image files

### Phase 2 - Fake platform + adapters (~5h)

- Run / implement fake platform (OAuth token issue, publish, 429 mode, webhook)
- `InstagramAdapter` + `XAdapter` implementing `SocialPublisher`
- Encrypted token storage
- Idempotency key on publish
- Honor `Retry-After` on 429 with backoff
- Checkpoint: curl/publish once; second identical publish does not create a second remote post

### Phase 3 - Schedule worker + webhook status (~5h)

- Schedule API: set `scheduledFor`, enqueue durable job
- Worker: claim jobs, publish through interface, survive restart (locking / done flags)
- Delivery webhook: verify signature; reject forgeries with `400`; update status
- Campaign view UI (Broadcast): thumbs, captions, status pills, schedule control
- Checkpoint: schedule “soon”, advance/trigger worker, status reaches published via webhook

### Phase 4 - Pitch surface, tests, ship (~4h)

- Marketing landing (Broadcast Frame) + campaign dashboard parity
- Full test suite green
- Pitch README (`git clone` first), mermaid diagram, screenshots in `docs/images/`
- `pnpm test` (or equivalent), public repo push, `SUBMISSION.md`

---

## API sketch (adjust names, keep behaviors)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/campaigns` | demo key / session | body: `{ title, body, url }` -> create campaign + variants + captions |
| GET | `/api/campaigns/:id` | session | board payload |
| POST | `/api/campaigns/:id/schedule` | session | `{ platform, runAt }` |
| POST | `/api/campaigns/:id/publish` | session | immediate publish path (still idempotent) |
| POST | `/api/webhooks/social-delivery` | signature | fake platform callback |
| GET | `/api/platforms` | public/session | specs for UI |

Demo auth may be a seeded API key (same pattern as Checkpoint) for speed.

---

## Tests (minimum)

1. Variant dimensions for `instagram` and `x` match `platform-specs`
2. Duplicate publish / retry -> one remote post (idempotency)
3. Forged webhook signature -> `400`, status unchanged
4. Forced `429` -> client waits `Retry-After` (fake clock or stub ok)
5. Optional: worker resume after simulated crash does not double-post

---

## Study these FlyRank parts (when available on disk)

- Caption fragments: `config/social-prompts.config.ts`
- Status shape: `SocialPostEntry` / `ContentSocials` in `types/content.types.ts`
- Image variants: `inngest/generateImageForContent.ts`, `lib/dynamic-image-variants/`
- Webhook signature + encryption: `app/api/webhooks/stripe/route.ts`, `lib/serverUtils.ts`
- Fake platform: `starters/challenge-5-social/`

If a path is missing, recreate the **behavior** and document the stand-in. Do not block the Capstone on monorepo access.

Built from: A5/A6 (validation, idempotent publish) · A11 (captions) · A9
(scheduling) · A14 (adapter + signed webhook) · Challenge 3 (caption fragments).

---

## Stretch (only after core DoD)

- Real platform opt-in (personal app, never committed secrets)
- Brand templating (logo / safe-zones per store)
- A/B captions (stable-hash choice)
- Analytics loopback (likes/clicks)
- Approval workflow (`draft -> approved -> queued`)
- Run as a node on Capstone 1 if that stack exists

---

## Demo script (README should enable this)

1. Start from a blog post -> **Make campaign**
2. Show different images (square vs wide) and different captions (X vs Instagram)
3. Schedule one for later -> advance time -> worker publishes
4. Hammer publish -> one post, not five
5. Force 429 -> show backoff
6. Fire forged delivery webhook (rejected) then valid one (status -> published)
7. Close on campaign view, green across platforms - zero real accounts touched

---

## Shipping checklist (from skills)

- [ ] `capstone-broadcast-design` applied (rose, Syne, frame mark)
- [ ] `capstone-signal-design` harness applied (Lenis, hero L/R, interactivity,
      scrollbars, pitch README with `git clone` first, screenshots, phase commits)
- [ ] Public GitHub repo (`flyrank-capstone-broadcast` or similar)
- [ ] `SUBMISSION.md` with Deliverable links + Notes
- [ ] No real social tokens in git history

---

## How to start (agent)

1. Read both skills fully.
2. Create the project folder if needed; `git init` early; ignore secrets/DB.
3. Execute Phase 0 -> 4 in order; commit after each phase.
4. Prefer working software and honest tests over decorative stretch features.
5. End with `SUBMISSION.md` + pasteable form fields for the user.
