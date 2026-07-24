# BidGenius Eastern US Autonomous Bid Factory

## Objective
Operate a governed, production-targeted pipeline that discovers public bid opportunities and qualified contractors across the configured eastern United States, prepares complete bid packages, routes them to Kevin for final review, and sends only approved outbound email.

## Geographic scope
Initial state set: ME, NH, VT, MA, RI, CT, NY, NJ, PA, DE, MD, DC, VA, WV, NC, SC, GA, FL, OH, KY, TN, AL, MS.

The state list is configuration, not hard-coded business logic. Counties, metros, and ZIP clusters are processed in batches to avoid timeouts and rate-limit spikes.

## Pipeline lanes

### 1. Contractor acquisition
1. Generate state and metro work packets.
2. Query approved sources through XTREME-SCRAPER and provider APIs.
3. Normalize company name, website, phone, email, address, service categories, source, and source timestamp.
4. Deduplicate by normalized domain, phone, email, and company-plus-location fingerprint.
5. Validate contactability and suppress opted-out, bounced, duplicate, blocked, or unverified records.
6. Score service fit for polished concrete, epoxy, coatings, grinding, restoration, and adjacent commercial construction.

### 2. Bid opportunity discovery
1. Ingest public contract opportunities and permitted invitation-to-bid sources.
2. Store title, issuer, location, trade scope, due date, documents, source URL, and source timestamp.
3. Classify whether the work matches NCP, NEP, or a partner/fulfillment contractor.
4. Reject expired, inaccessible, duplicate, out-of-scope, or insufficiently documented opportunities.

### 3. Fulfillment
1. Parse plans, specifications, emails, and scope documents.
2. Extract quantities, system requirements, preparation needs, schedule, exclusions, certifications, and submission instructions.
3. Generate takeoff and pricing using the deterministic bid engine when possible.
4. Use AI only for extraction, classification, narrative drafting, and explicit assumption handling.
5. Produce proposal HTML/PDF, internal cost sheet, confidence score, assumptions, source evidence, and submission checklist.

### 4. Kevin review gate
Every outbound package enters `KEVIN_REVIEW_REQUIRED`.

Kevin may:
- approve
- reject
- request revision
- change price or margin
- change assigned company/representative
- approve one record
- approve an explicitly bounded batch

No record enters the send queue unless the latest approval state is `KEVIN_APPROVED`.

### 5. Outbound email
Approved messages must include:
- accurate sender identity and subject
- verified recipient address
- the approved proposal or introduction
- valid physical mailing address
- functional unsubscribe/suppression path for commercial prospecting
- send receipt, provider message ID, and exact approved content hash

The pipeline must never send to suppressed, opted-out, bounced, role-blocked, or unverified recipients.

### 6. Tracking and learning
Track delivery, bounce, complaint, reply, meeting, bid submitted, won, lost, and value. Feed outcomes back into source quality, contractor fit, opportunity fit, pricing confidence, and prioritization. Do not automatically alter protected pricing rules without operator approval.

## Queue states
- DISCOVERED
- NORMALIZED
- DUPLICATE_REJECTED
- QUALIFIED
- DOCUMENTS_REQUIRED
- FULFILLING
- VALIDATION_FAILED
- KEVIN_REVIEW_REQUIRED
- REVISION_REQUESTED
- KEVIN_APPROVED
- SEND_QUEUED
- SENT
- DELIVERED
- REPLIED
- BID_SUBMITTED
- WON
- LOST
- SUPPRESSED
- BLOCKED

## Autonomy policy
Automatic:
- discovery
- normalization
- deduplication
- enrichment from approved sources
- classification and scoring
- document parsing
- draft takeoff and proposal generation
- validation
- queue movement before review
- reminders and internal reports

Approval-gated:
- outbound email
- bid submission to third-party portals
- changes to pricing authority
- new paid data-provider spend
- credentials, domains, or sender identities
- destructive record changes

## Required services
- Strategic-Minds/bidgenius
- Strategic-Minds/XTREME-SCRAPER
- canonical BrowserWorker for permitted browser evidence
- Supabase or equivalent durable operational database
- Vercel workflows/cron for small recurring dispatch jobs
- Resend or approved email provider
- Base44 AUTO BUILDER ORCHESTRATOR registries

## Reliability requirements
- idempotent work packets
- checkpointed cursors by state/metro/source
- bounded concurrency
- exponential retry with dead-letter queue
- content and source hashes
- full receipts
- no secrets in source control or registries
- preview validation before production changes
- rollback for code and configuration releases

## First implementation sequence
1. Create durable contractor, opportunity, document, bid-package, approval, outreach, suppression, and run tables.
2. Add Eastern US territory generator and cursor-based dispatcher.
3. Connect XTREME-SCRAPER through an authenticated internal endpoint.
4. Add permitted public-opportunity adapters, beginning with official APIs.
5. Add fulfillment worker using existing BidGenius and XTREME-SCRAPER bid modules.
6. Build Kevin review dashboard.
7. Add approval-signed outbound worker.
8. Add delivery/reply tracking and daily operating report.
9. Run one-state pilot, then expand by measured batches.

## Launch gate
Production autonomy is enabled only after a pilot demonstrates:
- no duplicate sends
- no sends without Kevin approval
- suppression enforcement
- complete source evidence
- valid proposal math
- successful delivery tracking
- rollback and pause controls
