---
name: AshtechPay integration
description: AshtechPay v1 pay-in flow for activation and formation purchases
---

## Provider contract

Use `https://ashtechpay.top` server-side with the configured Bearer API key:

- `GET /v1/countries` for country operators
- `POST /v1/collect` for Mobile Money initiation and OTP retry
- `GET /v1/transaction/:transactionId` for status polling

The collect payload uses `amount`, `currency`, `phone`, `operator`, `country_code`, `reference`, and `notify_url`. Responses can be `202` with USSD Push or Wave, or `400` with `error: "otp_required"`.

**Why:** This is the provider used by the project. SendavaPay SDK endpoints are not part of the payment flow.

## Webhooks

AshtechPay sends a `payment.completed` event with `status: "completed"` and the original `reference`. The reference embeds the Nexarix user or purchase ID and is matched before crediting anything. Activation updates the user conditionally so a webhook and status poll cannot distribute commissions twice.

## Withdrawals

Withdrawals remain manual. Approving a withdrawal must never call a provider payout endpoint.

## Legacy storage names

Some existing database and API field names still contain `sendavapay` because they predate the provider correction. They are storage compatibility names only; do not interpret them as permission to call SendavaPay.