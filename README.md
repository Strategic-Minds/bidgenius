# BidGenius | XTREME AI SYSTEMS

BidGenius is the canonical XTREME AI SYSTEMS platform for contractor intelligence, public bid opportunity discovery, AI-assisted takeoff and proposal fulfillment, human approval, and controlled outbound delivery.

## Architecture authority

- `public.bidgenius_contractors` is the canonical contractor candidate table.
- `public.bidgenius_opportunities` is the canonical opportunity table.
- The national extension adds verification, XPS relationship, compliance, capacity, state coverage, subcontractor, assignment, checkpoint, and receipt records without cloning the source tables.
- Scraped businesses are candidates, not approved XPS contractors.
- External communication requires a signed approval, suppression check, idempotency check, enabled execution gate, and enabled outbound gate.

## Safe operating defaults

```text
PIPELINE_EXECUTION_ENABLED=false
OUTBOUND_ENABLED=false
ADMIN_UI_AUTH_ENABLED=false
```

With pipeline execution disabled, scheduled routes return a plan and invoke no scraper, feed, AI, or outbound provider. Production must enable operator authentication before exposing administrative pages or AI endpoints.

## Core modules

| Module | Purpose |
|---|---|
| Contractor discovery | Calls the authenticated XTREME-SCRAPER bridge and upserts by deterministic fingerprint. |
| Opportunity discovery | Pulls configured HTTPS JSON, RSS, or Atom feeds with host, size, timeout, and redirect controls. |
| Takeoff | Converts bounded job context into structured proposal data through the configured AI gateway. |
| Plan reader | Extracts bounded PDF text or analyzes approved image formats through an authenticated AI route. |
| Fulfillment | Creates review-pending proposals only when the master execution gate is enabled. |
| Review | Records approve, revise, or reject decisions using server-configured reviewer identity and HMAC evidence. |
| Outbound | Sends only approved, unsuppressed, not-previously-sent proposals through the configured provider. |
| National operations | Adds 50-state coverage, XPS contractor qualification, subcontractor compliance, assignment gates, checkpoints, and validation receipts. |

## Local validation

Use Node.js 20 or newer.

```bash
npm install
npm run validate
npm run typecheck
npm run build
```

The CI workflow also runs a production dependency audit at the high severity threshold.

## Environment setup

Copy `.env.example` to the environment manager used by the preview deployment. Never commit real secret values, private Drive links, customer addresses, or internal recipient lists.

Required for the protected pipeline:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PIPELINE_SECRET` or `CRON_SECRET`
- `KEVIN_REVIEW_SECRET`
- `REVIEWER_IDENTITY`
- `AI_GATEWAY_API_KEY`
- `XTREME_SCRAPER_URL`
- `XTREME_SCRAPER_SECRET`

Required only for live outbound:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- optional `EMAIL_REPLY_TO`
- optional `EMAIL_CC`
- `PIPELINE_EXECUTION_ENABLED=true`
- `OUTBOUND_ENABLED=true`

## Database migrations

Migration files are committed as review artifacts. They are not proof that a database was changed.

1. `20260724_bidgenius_autonomous_pipeline.sql`
2. `20260726_bidgenius_national_extension.sql`
3. `20260726_bidgenius_security_hardening.sql`

Every new extension has a rollback companion. Before applying any migration:

1. Export a verified backup.
2. Confirm the base tables exist.
3. Run duplicate and orphan preflight queries.
4. Apply in a non-production environment.
5. Verify RLS, indexes, triggers, constraints, and rollback.
6. Record a migration receipt.
7. Obtain explicit production approval.

## Release gates

A production release is blocked until all of the following pass:

- dependency installation and security audit
- TypeScript validation
- domain and governance tests
- production build
- preview route smoke tests
- authenticated AI endpoint tests
- dry-run proof showing zero external work
- migration preflight and rollback rehearsal
- desktop and mobile UI validation
- operator review of approval and outbound behavior
- explicit production and outbound approval

## Documentation

- `docs/NATIONAL_MERGE_ARCHITECTURE.md`
- `docs/FORENSIC_AUDIT_2026-07-26.md`
- `docs/HARDENING_ROADMAP.md`
- `docs/BIDGENIUS_EASTERN_US_AUTONOMOUS_PIPELINE.md`

## Security posture

The public repository contains code and configuration names only. Private operational resources belong in authenticated environment variables and controlled document systems. Sensitive API responses are never cached by the service worker, administrative AI routes require operator authorization, and outbound delivery is fail-closed.
