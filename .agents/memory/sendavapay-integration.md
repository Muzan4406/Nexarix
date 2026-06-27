---
name: Sendavapay SDK Integration
description: Correct endpoints, payload fields, webhook format, payout flow for the new SDK v1
---

## Base URL
`https://sendavapay.com/api/sdk/v1`

## Auth
`Authorization: Bearer sdk_...` — server-side only, never in frontend

## Pay-in (activation)

### POST /create-payment
Fields: `amount`, `currency` (XOF/XAF/GNF/CDF), `description`, `customerName`, `customerEmail`, `customerPhone`, `payerCountry` (ISO), `webhookUrl`, `externalReference`
Returns: `{ reference, paymentToken, expiresAt, status: "pending" }` — **no paymentUrl, no redirectUrl**

**Why:** Old integration expected a paymentUrl redirect — new SDK uses embedded flow via paymentToken + CORS client endpoints.

### Client CORS endpoints (frontend, no auth key needed)
- `GET /operators/:countryCode` — list available operators, filter `status === "online"`
- `POST /initiate-payment` — `{ paymentToken, payerName, payerPhone, payerCountry, operatorId }`
  - Returns `requiresOtp: true` + `otpToken` (Orange Money), or `requiresRedirect: true` + `redirectUrl` (Wave), or neither (push to phone)
- `POST /submit-otp` — `{ otpToken, otp }` — only for Orange Money operators
- `GET /operators-status` — public endpoint, no auth required

### GET /payment-status/:reference
Returns `{ status: "pending"|"processing"|"completed"|"failed"|"cancelled" }`

### POST /verify-payment
Body: `{ reference }` — returns full transaction details. Use server-side to confirm before activating.

## Pay-out (withdrawals)

### POST /withdraw
Fields: `amount`, `phoneNumber` (E.164), `operator` (slug), `country` (ISO), `currency`, `description`, `externalReference`
Returns: `{ withdrawalId, reference, status: "queued" }` — processed async

**Operator slugs:** tmoney, moov, mtn, orange, wave, airtel, freemoney, vodacom, cellcom, wizall

### GET /withdrawal-status/:reference
Statuses: queued → processing → provider_pending → completed | failed | reversed | cancelled

### POST /validate-withdrawal (dry-run)
Check balance + operator availability before executing. Returns `valid`, `fee`, `netAmount`, `walletBalance`.

## Webhooks

### Setup
- Configure via `PUT /webhook { webhookUrl }` or pass per `create-payment`
- Returns `webhookSecret` — store as env var (shown once)

### Headers
- `X-SendavaPay-Signature: sha256={hmac_hex}` — HMAC-SHA256 of **raw Buffer body** (NOT JSON.stringify)
- `X-SendavaPay-Event: payment.completed|payment.failed|withdrawal.completed|withdrawal.failed`

**How to apply:** Register `express.raw({ type: "application/json" })` for `/api/activate/webhook` BEFORE `express.json()` in app.ts. Compare `"sha256=" + hmac.digest("hex")` with timing-safe equal.

### Payload (flat, not nested under data)
```json
{ "event": "payment.completed", "reference": "sdk_...", "externalReference": "nexarix-activation-...", "status": "completed", ... }
```

## Country / Currency Mapping
| Country name | ISO | Currency |
|---|---|---|
| Togo | TG | XOF |
| Bénin | BJ | XOF |
| Côte d'Ivoire | CI | XOF |
| Cameroun | CM | XAF |
| Burkina Faso | BF | XOF |
| Mali | ML | XOF |
| Niger | NE | XOF |
| Sénégal | SN | XOF |
| Guinée | GN | GNF |
| RD Congo | COD | CDF |
| Congo/Gabon/Tchad/CF/GQ | COG/GA/TD/CF/GQ | XAF |

## Implementation notes
- No merchant_id — auth is purely the SDK key (prefix sdk_)
- `withdrawals` table: added `country`, `sendavapayReference`, `sendavapayStatus` columns
- Auto-payout triggered when admin approves (PATCH /admin/withdrawals/:id/approve) and paymentMode=auto
- `withdrawal.failed` webhook refunds `amountGross` to user balance automatically
- Phone normalization: `00XXX` → `+XXX`, else prepend `+` if missing
- `externalReference` for payout: `nexarix-withdrawal-{withdrawalId}`
