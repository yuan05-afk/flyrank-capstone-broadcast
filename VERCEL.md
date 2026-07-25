# Deploy Broadcast (Social Media Studio) to Vercel

Repo: https://github.com/yuan05-afk/flyrank-capstone-broadcast

You deploy manually. This file is the checklist.

## 1. Create a Neon Postgres database

1. Open https://console.neon.tech and create a project (or a database named `broadcast`).
2. Copy the connection string (include `sslmode=require`).
3. Keep SQLite out of Vercel. `DATABASE_URL=file:./dev.db` will not work on serverless.

## 2. Import env vars

1. In Vercel, create a project from `yuan05-afk/flyrank-capstone-broadcast`.
2. Framework: Next.js. Install: `pnpm install`. Build uses `vercel.json`.
3. Open Project Settings -> Environment Variables.
4. Paste values from `env.vercel.import` (Production + Preview).
5. Generate a real `TOKEN_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

6. Set `FAKE_PLATFORM_IN_APP=true` and leave `FAKE_PLATFORM_URL` empty so publish
   uses `/api/fake-platform` on the same deployment (no second process on port 4100).

## 3. Deploy

Deploy from the Vercel dashboard (or `vercel --prod` if you prefer the CLI).

After the first domain exists, update:

- `NEXT_PUBLIC_APP_URL=https://broadcast-flyrank.vercel.app`
- `APP_WEBHOOK_BASE_URL=https://broadcast-flyrank.vercel.app`

Redeploy once so webhooks and OAuth callbacks use the public URL.

## 4. Seed production data (once)

From your laptop, against the Neon URL:

```bash
cd "Social Media Studio"
$env:DATABASE_URL = "postgresql://..."   # PowerShell
pnpm db:push
pnpm db:seed
```

POSIX:

```bash
DATABASE_URL="postgresql://..." pnpm db:push
DATABASE_URL="postgresql://..." pnpm db:seed
```

## 5. Smoke test

1. Open the marketing site.
2. Sign in with `DEMO_API_KEY`.
3. Create a campaign (variants render into `/tmp` on Vercel, served via `/api/media`).
4. Publish to the fake Instagram/X adapters.
5. Confirm delivery webhook marks the post published.

## Notes

- Local dual-process (`pnpm dev` + `pnpm dev:fake`) still works when
  `FAKE_PLATFORM_URL=http://localhost:4100`.
- Variant PNGs on Vercel are ephemeral per instance (`/tmp`). That is enough for
  Capstone demos; durable object storage can come later.
- Sharp is already marked external in `next.config.js`.
- After all Capstones are live, put this URL into Muni's
  `NEXT_PUBLIC_CAPSTONE_BROADCAST_URL` env.
