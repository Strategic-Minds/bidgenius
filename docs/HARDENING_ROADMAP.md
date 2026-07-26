# Hardening and Optimization Roadmap

Status: Review plan
Rule: No production mutation without explicit approval and passing receipts

## Phase 0 | Current branch

- Merge national domain rules into BidGenius without duplicate source tables.
- Remove private Drive and internal email references from public source.
- Protect AI and outbound endpoints.
- Make dry runs perform zero external work.
- Stop service-worker caching of API and proposal data.
- Upgrade the framework baseline.
- Add tests, validation, CI, health reporting, response headers, migration artifacts, rollback, and audit documentation.

Exit gate: Draft pull request checks and preview build pass.

## Phase 1 | Preview verification

- Verify anonymous AI requests return 401.
- Verify execution-disabled cron invokes no providers.
- Verify outbound-disabled send returns 423.
- Verify service-worker cache contains only approved public assets.
- Verify mobile and desktop national operations layouts.
- Verify no private URLs, email allowlists, pricing rules, or secret values appear in bundles or responses.
- Run route inventory and classify every endpoint as public, operator, reviewer, pipeline, webhook, or health.

Exit gate: Browser, API, and security receipts pass.

## Phase 2 | Database rehearsal

- Export non-production backup.
- Verify base migration alignment.
- Apply national extension.
- Validate 50 state rows and all foreign keys.
- Validate RLS is enabled and no browser policies grant unintended access.
- Run active-outbound duplicate preflight.
- Apply security hardening.
- Test invalid approval, sent-state rollback, signature mismatch, and assignment-without-receipt failures.
- Run rollback scripts and compare schema.

Exit gate: Migration and rollback receipts pass.

## Phase 3 | Identity and authorization

Replace interim Basic authentication with production identity:

- SSO or managed authentication
- named users
- roles for operator, reviewer, estimator, administrator, and read-only auditor
- short-lived sessions
- revocation
- multi-factor authentication
- immutable decision identity
- route-level authorization matrix
- session and privilege audit receipts

Exit gate: Threat model and authorization tests pass.

## Phase 4 | Data quality and contractor intelligence

- Add email, phone, website, license, insurance, and legal-identity verification lanes.
- Add provenance and confidence per field.
- Separate discovered, enriched, verified, consented, qualified, and assignable states.
- Add deterministic cross-source entity resolution.
- Add duplicate-review queue instead of silent merges for ambiguous matches.
- Add contact freshness and verification expiration.
- Add XPS customer and training matching through protected hashes and approved evidence sources.

Exit gate: Accuracy, false-match, and provenance benchmarks pass.

## Phase 5 | Takeoff and pricing reliability

- Move pricing rules into versioned protected records.
- Require effective dates, author, approver, and rollback for each pricing profile.
- Add deterministic calculation after AI extraction rather than allowing AI to perform final arithmetic.
- Add unit normalization and line-item schema validation.
- Add dual-engine or human review for low-confidence quantities.
- Add document citations to page, section, table, and text evidence.
- Add scanned-PDF OCR only through an approved isolated document pipeline.
- Benchmark takeoff accuracy against a labeled project set.

Exit gate: Quantity, pricing, and citation accuracy targets pass.

## Phase 6 | Queue and concurrency reliability

- Add atomic job claims and leases.
- Add retry budgets and dead-letter queues.
- Add idempotency keys across scraper, AI, fulfillment, review, and outbound stages.
- Add per-provider circuit breakers.
- Add concurrency limits and spend budgets.
- Add monotonic watermarks for contractor and opportunity ingestion.
- Add replay-safe receipts.

Exit gate: Parallel-worker, retry, timeout, and replay tests pass.

## Phase 7 | Observability and cost controls

- Structured logs with correlation IDs.
- Provider latency and error metrics.
- Token, scrape, email, storage, and database cost attribution.
- Per-run and daily budgets.
- Alerts for stalled queues, unusual spend, duplicate sends, auth failures, and data-quality regressions.
- Redaction rules for PII and proposal content.
- Operational dashboards sourced from receipts, not hardcoded values.

Exit gate: Alerts and budget-stop drills pass.

## Phase 8 | User experience and accessibility

- Replace inline style duplication with design tokens and components.
- Remove fixed personal greetings.
- Add loading, empty, degraded, blocked, and retry states.
- Add keyboard navigation and visible focus.
- Add screen-reader labels and accessible tables.
- Add responsive tables and mobile approval workflows.
- Add accessibility, visual-regression, and performance tests.

Exit gate: WCAG review, mobile review, and visual regression pass.

## Phase 9 | Controlled production release

- Freeze source commit.
- Record environment manifest without values.
- Apply approved migrations.
- Deploy production.
- Run production smoke tests with outbound disabled.
- Validate health, authentication, queues, and receipts.
- Enable pipeline execution through an explicit decision.
- Enable outbound through a separate explicit decision.
- Send one controlled internal test.
- Monitor and retain rollback readiness.

Exit gate: Operator signs production and outbound receipts independently.
