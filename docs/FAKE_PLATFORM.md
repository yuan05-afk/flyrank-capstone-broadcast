# Fake platform contract

Local stand-in for OAuth + publish + rate limits + signed delivery webhooks.
No live social APIs.

## Base URL

`http://localhost:4100` (`pnpm dev:fake`)

## Endpoints

| Method | Path | Behavior |
|--------|------|----------|
| POST | `/oauth/token` | Returns `{ access_token }` for a platform |
| POST | `/v1/:platform/posts` | Publishes; requires `Authorization`, `Idempotency-Key` |
| GET | `/v1/:platform/posts` | Lists posts (debug) |
| POST | `/admin/force-429` | `{ enabled: boolean }` toggles rate limit |
| POST | `/admin/deliver` | Re-sends signed webhook for a post |

## Headers

- `Authorization: Bearer <token>`
- `Idempotency-Key: <stable key>` - duplicate keys return the same post
- On 429: `Retry-After: <seconds>`

## Webhook

POST to `APP_WEBHOOK_BASE_URL/api/webhooks/social-delivery` with body:

```json
{ "externalPostId": "...", "idempotencyKey": "...", "status": "published" }
```

Header: `X-Broadcast-Signature: <hmac-sha256-hex of raw body using FAKE_PLATFORM_WEBHOOK_SECRET>`
