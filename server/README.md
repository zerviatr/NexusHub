# ZenDev License Server

Node.js + Express + LibSQL (Turso) + LemonSqueezy Webhooks + Resend Email

## Setup

```bash
cp .env.example .env
# Fill in your keys in .env
npm install
npm run dev
```

## Deploy to Railway

1. Push this `server/` directory to a Git repo (or use a Railway monorepo setup)
2. Create a new Railway project → **Deploy from GitHub**
3. Set all environment variables from `.env.example` in the Railway dashboard
4. Railway auto-detects the `Dockerfile` and builds it

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (Railway sets this automatically) |
| `TURSO_URL` | Yes | LibSQL URL — `file:./zendev.db` for local, `libsql://...` for Turso cloud |
| `TURSO_AUTH_TOKEN` | Prod only | Turso auth token |
| `NEXUS_LICENSE_SECRET` | Yes | **Must match** the secret in Electron's `licenseStore.ts` |
| `DEVICE_HMAC_SECRET` | Yes | Secret for hashing device IDs before storing |
| `LEMONSQUEEZY_API_KEY` | Yes | From LemonSqueezy dashboard → API |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Yes | From LemonSqueezy → Webhooks → Signing secret |
| `RESEND_API_KEY` | Yes | From resend.com |
| `EMAIL_FROM` | Yes | Sender address e.g. `ZenDev <license@yourdomain.com>` |

## LemonSqueezy Webhook Setup

1. Go to LemonSqueezy → Settings → Webhooks
2. Add endpoint: `https://your-railway-app.railway.app/webhook/lemonsqueezy`
3. Events to enable:
   - `order_created`
   - `subscription_cancelled` (if you sell subscriptions)
4. Copy the signing secret → set as `LEMONSQUEEZY_WEBHOOK_SECRET`

## API Endpoints

```
POST /webhook/lemonsqueezy   — LemonSqueezy payment events (internal)
POST /api/license/activate   — { key, deviceId } → { success, tier, expiresAt }
POST /api/license/verify     — { key, deviceId } → { valid, tier, expiresAt }
POST /api/license/deactivate — { key, deviceId } → { ok }
GET  /health                 — { ok, ts }
```

## Local Testing

```bash
# Start server
npm run dev

# Test health
curl http://localhost:3000/health

# Simulate webhook (replace with real payload from LS test)
curl -X POST http://localhost:3000/webhook/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "x-event-name: order_created" \
  -H "x-signature: <hmac>" \
  -d '{"data": {...}}'
```
