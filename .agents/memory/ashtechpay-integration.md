---
name: Payment providers
description: AshtechPay and DrimPay pay-in flows for activation and formation purchases
---

## Provider contract

Use `https://www.ashtechpay.com` server-side with a Direct API key (`ak_...`) sent as `Authorization: Bearer ...`:

- `GET /v1/countries` for country operators
- `POST /v1/collect` for Mobile Money initiation and OTP retry
- `GET /v1/transaction/:transactionId` for status polling

The collect payload uses `amount`, `currency`, `phone`, `operator`, `country_code`, `reference`, and `notify_url`. Responses can be `200` with a completed/successful payment, `202` with USSD Push or Wave, or `400` with `error: "otp_required"`. OTP retries must reuse the returned or original merchant reference.

**Why:** This is the provider used by the project. SendavaPay SDK endpoints are not part of the payment flow.

## Webhooks

AshtechPay sends a `payment.completed` event with `status: "completed"` and the original `reference`. When a webhook secret (`whsec_...`) is configured, verify `X-Ashtech-Timestamp` and `X-Ashtech-Signature: sha256=...` using HMAC-SHA256 over `timestamp.raw_body` with a five-minute replay window. The server must re-read `GET /v1/transaction/:id` and require `success`/`completed` before fulfillment. The reference embeds the Nexarix user or purchase ID and is matched before crediting anything. Activation and formation completion are conditional/idempotent so duplicate webhooks cannot distribute commissions twice.

## Withdrawals

Withdrawals remain manual. Approving a withdrawal must never call a provider payout endpoint.

## DrimPay alternative

DrimPay uses `/api/v2/payin/initiate` and `/api/v2/payin/:reference`. Live keys start with `dp_live_sk_`; sandbox keys start with `dp_sandbox_sk_`. DrimPay confirmations require HMAC-SHA256 over `timestamp.raw_body` with a five-minute replay window. Its operator names are slugs (`tmoney`, `moov`, `mtn`, `orange`, `wave`, `wizall`, `airtel`, `vodacom`) and phone numbers must be E.164.

**Why:** The admin can switch the provider for both activation and formation payments. Provider selection must not alter commission logic or enable withdrawal payouts.

**How to apply:** Keep the provider-specific API key and webhook secret server-side. Test DrimPay with sandbox credentials before selecting it for live payments.

## Legacy storage names

Some existing database and API field names still contain `sendavapay` because they predate the provider correction. They are storage compatibility names only; do not interpret them as permission to call SendavaPay.