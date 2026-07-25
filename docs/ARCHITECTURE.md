# Architecture - Broadcast

## Layers

`repository -> service -> route handler`

- Repositories: only Prisma access
- Services: captions, variants, campaign orchestration, publish
- Publishers: `SocialPublisher` interface + Instagram/X adapters against the fake platform
- Workers: durable schedule claims with lock + done flags

Crop geometry lives in `lib/images/geometry.ts` with no `sharp` or `fs` imports, so the
render pipeline and the campaign desk overlay compute identical rectangles.

## Publish path

```
blog post -> captions + variants -> SocialPost (draft)
  -> schedule/publish -> Job queue -> adapter.publish(idempotencyKey)
  -> fake platform -> signed webhook -> status published|failed
```

## Safety

- Tokens encrypted AES-256-GCM, random IV per write
- Idempotency key unique per (campaign, platform)
- 429 honors Retry-After with backoff
- Webhook HMAC SHA-256; forgeries return 400
- Caption edits never rotate the idempotency key, so republishing edited copy replays

## Sandbox controls

`POST /api/demo` exposes three levers behind the demo session: `force429` flips the
platform into rate-limited mode, `replayWebhook` asks it to re-send a signed delivery,
and `forgeWebhook` posts a wrong-secret payload at the real webhook route and reports
the status it got back. Each one runs the production path rather than faking a result.

## Fake platform

Local server on `:4100` - see `docs/FAKE_PLATFORM.md`.
