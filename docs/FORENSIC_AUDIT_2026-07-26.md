# BidGenius Forensic Audit

Date: 2026-07-26
Scope: `Strategic-Minds/bidgenius` main at `309abd8ca247dfbe197cc9180edadd7dee3d48ea` plus the national donor branches
Audit branch: `codex/national-merge-hardening-20260726`
Status: Remediation in review. No production approval.

## Executive assessment

BidGenius had a real operational pipeline, but its application security and engineering controls were below the maturity of its automation capabilities. The audit found multiple paths where a public caller, browser cache, cron job, or parallel worker could bypass the intended operating posture or expose sensitive information.

The branch closes the highest-risk application defects, imports the national operating model without duplicating canonical data, and adds validation, CI, rollback, and database enforcement artifacts. Production remains blocked until preview validation and migration rehearsal pass.

## Severity summary

| Severity | Verified findings | Closed in branch | Still release-blocking |
|---|---:|---:|---:|
| Critical | 4 | 4 | 0 application defects, migration enforcement remains unapplied |
| High | 8 | 7 | 1 plus validation gates |
| Medium | 9 | 6 | 3 |
| Low | 5 | 3 | 2 |

## Critical findings

### C-01 Unauthenticated outbound email route

**Evidence:** `/api/send-proposal` accepted public POST requests, used the provider API key, and contained hardcoded sender and CC addresses.

**Impact:** Unauthorized paid email sends, bypass of approval and suppression controls, recipient abuse, and leakage of internal addresses.

**Remediation:**

- require pipeline or operator authentication
- require `OUTBOUND_ENABLED=true`
- verify the fulfillment approval HMAC
- use environment-configured sender, reply-to, and optional CC
- use provider idempotency keys
- return stable errors without provider detail

**Status:** Closed in branch.

### C-02 Sensitive API and proposal caching

**Evidence:** The service worker cached all GET `/api/` responses for five minutes and stored pending proposal payloads in browser Cache Storage for background replay.

**Impact:** Proposal, customer, approval, and operational data could remain on shared devices or be served stale. Offline replay could submit sensitive payloads outside the current authenticated state.

**Remediation:**

- API requests are network-only and `no-store`
- navigation is network-only with a static offline page
- only immutable public assets are cached
- background bid replay is disabled
- push URLs are restricted to same-origin paths

**Status:** Closed in branch.

### C-03 Public AI spend endpoints

**Evidence:** Takeoff and plan-analysis routes were unauthenticated and could invoke the AI gateway. Plan analysis accepted uploads up to 20 MB.

**Impact:** Uncontrolled token spend, denial of service, customer-data processing without authorization, and prompt-injection exposure.

**Remediation:**

- require pipeline or authenticated operator access
- fail closed when AI configuration is absent
- restrict file formats and size
- bound text, context, output, and provider duration
- treat document content as untrusted data
- validate AI JSON shape
- suppress raw provider errors

**Status:** Closed in branch.

### C-04 Execution-disabled cron could still send

**Evidence:** The cron send phase called the outbound worker regardless of `PIPELINE_EXECUTION_ENABLED`.

**Impact:** Scheduled sending could occur while operators believed the pipeline was paused if the separate outbound switch was enabled.

**Remediation:** Every cron phase now returns a no-work plan when execution is disabled. Sending requires both execution and outbound gates.

**Status:** Closed in branch.

## High findings

### H-01 Dry run invoked external work

Contractor discovery called XTREME-SCRAPER, opportunity discovery called feeds, and fulfillment invoked AI in dry-run mode.

**Remediation:** Dry runs are plan-only and report `external_work_invoked: false` or `ai_invoked: false`.

**Status:** Closed.

### H-02 Vulnerable framework baseline

The main branch used Next.js 14.2.3. Current official advisories published in July 2026 identify multiple affected Next.js ranges below patched releases.

**Remediation:** Upgrade branch to Next.js 15.5.21 and React 19.1, with CI build and dependency audit gates.

**Status:** Code updated. Release-blocking until dependency install, audit, and build pass.

### H-03 Proprietary pricing and policy data in public source

Exact internal billing rates, markup assumptions, payment terms, and scope language were embedded in the takeoff prompt in a public repository.

**Remediation:** Remove proprietary values from the current source tree. Require protected `TAKEOFF_PRIVATE_CONTEXT` server configuration. The route fails closed when absent.

**Residual:** Historical Git commits still contain the old values. Repository visibility and history-remediation decisions require separate operator approval.

**Status:** Current source closed; historical exposure open.

### H-04 Private document links and internal addresses in donor code

The private donor repository contained Drive links and internal simulation addresses. The canonical repository is public.

**Remediation:** Donor code was adapted, not copied. Private resource locations are environment configuration and APIs expose configured booleans only.

**Status:** Closed.

### H-05 Reviewer impersonation

The review API accepted the reviewer name from the request body.

**Remediation:** Reviewer identity comes from server configuration. Review decisions only transition reviewable records and produce HMAC evidence.

**Status:** Closed.

### H-06 Duplicate outbound race

The worker checked for prior sends but the database did not guarantee one active outbound record per fulfillment.

**Remediation:** Add provider idempotency plus a migration with a unique partial index and approval-evidence trigger.

**Status:** Application mitigation closed. Database enforcement release-blocking until migration preflight and apply.

### H-07 Misleading system-health indicators

The UI displayed “System Online” regardless of environment or integration state.

**Remediation:** Sidebar now reports “Protected mode.” A health endpoint reports blockers and warnings from non-secret configuration checks.

**Status:** Closed.

### H-08 Thin engineering controls

The repository had no formal tests, typecheck, validation script, CI workflow, dependency audit, or meaningful README.

**Remediation:** Add domain tests, repository validation, TypeScript, production build, GitHub Actions, dependency audit, architecture, audit, rollback, and release documentation.

**Status:** Controls installed. Release-blocking until checks pass.

## Medium findings

### M-01 Raw provider and database errors

Several routes returned `String(error)` or provider response bodies.

**Remediation:** Hardened pipeline, AI, review, feed, and outbound paths now use stable error codes. Remaining routes must be swept during follow-up route inventory.

**Status:** Partially closed.

### M-02 Feed SSRF and unbounded response risk

Configured feed URLs could target arbitrary schemes or private hosts, follow redirects, and load unbounded payloads.

**Remediation:** HTTPS-only public-host checks, redirect refusal, timeout, response-size cap, bounded records, and limited secret header names.

**Status:** Closed for canonical feed adapter.

### M-03 Stale hardcoded metrics

The donor dashboard hardcoded contractor and opportunity totals.

**Remediation:** National metrics query the canonical tables and include freshness timestamps. Static UI labels no longer claim live totals.

**Status:** Closed.

### M-04 Candidate and approved contractor conflation

The donor model could be interpreted as treating scraped records as approved XPS contractors.

**Remediation:** National profiles reference canonical candidates. Consent, qualification, compliance, capacity, and receipt gates are separate.

**Status:** Closed.

### M-05 Weak database state transitions

The base database allowed application code to set approved or sent states without database validation.

**Remediation:** Security migration adds fulfillment and outbound evidence triggers, immutable sent state, signature matching, and assignment receipt foreign keys.

**Status:** Release-blocking until migration rehearsal and apply.

### M-06 Missing source-table idempotency for fulfillment

The base fulfillment table did not guarantee one current fulfillment per opportunity fingerprint.

**Remediation:** Application checks existing non-failed fulfillments. A supporting index is added.

**Residual:** A full revision/versioning model is preferable to a blanket uniqueness constraint.

**Status:** Mitigated, design improvement open.

### M-07 PDF capability overstated

When PDF text extraction failed, the original route told the AI to analyze structurally even though PDF bytes were not sent.

**Remediation:** The route now returns a clear extraction failure. Scanned-PDF OCR requires a separately approved pipeline.

**Status:** Closed, OCR capability open.

### M-08 Admin authentication is interim

Optional Basic authentication protects the UI, but it is not a complete role-based identity system.

**Remediation:** Fail-closed optional middleware and operator API authorization.

**Status:** Open for production-grade SSO, roles, session revocation, and audit identity.

### M-09 Data quality and enrichment

The live contractor source previously showed low contact coverage. This branch preserves source truth but does not solve enrichment, consent, or verification quality.

**Status:** Open product and data-quality workstream.

## Low findings

- Minimal repository documentation: closed.
- Missing API cache headers: closed.
- Fixed user-facing name in dashboard greeting: open personalization cleanup.
- Inline style duplication and limited design tokens: open UI refactor.
- No formal accessibility test suite: open.

## Release blockers

1. GitHub Actions must pass validation, TypeScript, tests, build, and production dependency audit.
2. Vercel preview must build and expose no private configuration.
3. Preview health must accurately report blocked configuration until safe test variables are supplied.
4. Protected AI endpoints must reject anonymous requests and accept authorized requests.
5. Dry-run cron proof must show zero scraper, feed, AI, and outbound calls.
6. Supabase migration must pass duplicate, orphan, RLS, trigger, and rollback rehearsal in non-production.
7. Browser tests must validate desktop, tablet, mobile, PWA cache behavior, upload limits, and approval flows.
8. A production-grade authentication decision must be approved.
9. Private pricing context must be installed outside source control.
10. Production deployment, migration, and outbound require explicit operator approval.

## Audit limitations

- No production database mutation was performed.
- No live provider email was sent.
- No repository visibility or history rewrite was performed.
- No private resource link was committed.
- Local dependency installation was unavailable in the execution container because outbound DNS was blocked; GitHub and Vercel checks are the executable source of truth for this branch.
- The review focused on known pipeline, AI, service-worker, national, and outbound paths. A complete route inventory remains a follow-up gate.
