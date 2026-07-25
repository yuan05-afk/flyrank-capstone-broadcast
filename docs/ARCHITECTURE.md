# Architecture - Broadcast

## Layers

`repository -> service -> route handler`

- Repositories: only Prisma access
- Services: captions, variants, campaign orchestration, publish
- Publishers: `SocialPublisher` interface + Instagram/X adapters against the fake platform
- Workers: durable schedule claims with lock + done flags

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

## Fake platform

Local server on `:4100` - see `docs/FAKE_PLATFORM.md`.
