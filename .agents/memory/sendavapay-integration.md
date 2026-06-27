---
name: Sendavapay integration
description: Correct API endpoints, payload structure, webhook format and signature verification for Sendavapay payment gateway (West African Mobile Money)
---

# Sendavapay API integration

**Why:** Initial implementation used wrong endpoint/param names. Correct details extracted from official docs.

## Endpoints (Base: https://sendavapay.com/api)

- **Create payment:** `POST /v1/create-payment`
- **Verify payment:** `POST /v1/verify-payment` — body: `{ reference }`
- **Credit account:** `POST /v1/credit-account`
- **Balance:** `GET /v1/balance?phone=...`

## Auth
`Authorization: Bearer pk_live_...` on every request.

## Create-payment payload
```json
{ "amount", "currency" (default XOF), "description", "externalReference", "customerEmail", "customerPhone", "customerName", "redirectUrl", "metadata" }
```
- `externalReference` = our internal order ID (e.g. `nexarix-activation-{userId}`)
- `redirectUrl` = where user is sent after payment (our `/payment-status` page)
- **No callback_url in request body** — webhook URL configured in Sendavapay merchant dashboard

## Create-payment response
```json
{ "success": true, "data": { "reference": "pay_abc123", "paymentUrl": "...", "status": "pending", ... } }
```

## Verify-payment response
```json
{ "success": true, "data": { "reference", "externalReference", "amount", "status": "completed", "customerEmail", ... } }
```
Use `externalReference` to map back to our userId.

## Webhook structure
- **Body:** `{ "event": "payment.completed", "data": { "reference", "amount", "currency", "customerPhone" }, "timestamp" }`
- **Headers:** `X-SendavaPay-Event`, `X-SendavaPay-Signature`
- **Signature verification:** `HMAC-SHA256(JSON.stringify(body), webhookSecret)` — secret starts with `whsec_`

## Nexarix flow
1. `POST /activate/initiate` → calls create-payment, returns `{ paymentUrl, reference }`
2. Frontend stores reference in sessionStorage, redirects user to paymentUrl
3. User pays, Sendavapay redirects to `/payment-status`
4. `/payment-status` polls `GET /activate/check?reference=...` — verifies via Sendavapay API if not yet active in DB
5. Webhook `POST /activate/webhook` → verifies signature → calls verify-payment to get externalReference → activates user + MLM commissions

**How to apply:** Any change to Sendavapay calls must use these exact field names. Merchant ID is NOT a field — only API key + webhook secret needed.
