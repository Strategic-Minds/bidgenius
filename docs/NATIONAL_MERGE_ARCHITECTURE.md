# National Merge Architecture

Date: 2026-07-26
Status: Branch implementation, not production approval
Canonical repository: `Strategic-Minds/bidgenius`
Donor repository: `Strategic-Minds/XPS-NATIONAL-AI-BID-OS`

## Decision

XTREME AI SYSTEMS / BidGenius remains the master platform. The donor repository contributes national operating concepts and schema modules only. The donor application shell, seeded dashboard numbers, duplicate opportunity model, and private document links are not copied into the public canonical repository.

## Authority map

| Domain | Canonical authority |
|---|---|
| Contractor candidate ingestion | `public.bidgenius_contractors` |
| Opportunity ingestion | `public.bidgenius_opportunities` |
| Proposal fulfillment | `public.bidgenius_fulfillments` |
| Human review | `public.bidgenius_reviews` |
| Outbound history | `public.bidgenius_outbound` |
| Suppression | `public.bidgenius_suppression` |
| National state rules | `public.bidgenius_state_registry` |
| XPS contractor qualification | `public.bidgenius_contractor_profiles` |
| Contractor state coverage | `public.bidgenius_contractor_state_coverage` |
| Subcontractor operations | `public.bidgenius_subcontractors` and related tables |
| Assignments | `public.bidgenius_contractor_assignments` and `public.bidgenius_subcontractor_assignments` |
| Sync watermarks | `public.bidgenius_sync_checkpoints` |
| Validation evidence | `public.bidgenius_validation_receipts` |
| Private documents | Authenticated external document system referenced by environment configuration |

## Data lifecycle

```text
SCRAPE
  -> NORMALIZE
  -> FINGERPRINT
  -> UPSERT CANDIDATE
  -> QUALIFY OPPORTUNITY
  -> GENERATE REVIEW-PENDING PROPOSAL
  -> HUMAN DECISION
  -> SIGNED APPROVAL
  -> SUPPRESSION AND IDEMPOTENCY CHECK
  -> SEND
  -> RECEIPT
  -> CONTRACTOR OR SUBCONTRACTOR ASSIGNMENT
  -> COMPLIANCE
  -> FULFILLMENT
  -> CLOSEOUT
  -> PERFORMANCE SCORE
```

## Candidate versus approved contractor

A row in `bidgenius_contractors` proves that a business was discovered and normalized. It does not prove:

- XPS customer status
- consent
- current insurance
- current licenses
- capacity
- equipment
- training
- relevant project experience
- safety history
- willingness to travel
- approval for assignment

Those facts belong in the national extension and require evidence. Assignment checks enforce qualified status, granted consent, passed compliance, and an approval receipt.

## Public repository boundary

The canonical repository is public. Therefore it must not contain:

- private Google Drive folder identifiers
- internal email allowlists
- secret values
- customer purchase data
- training records
- W-9 documents
- insurance certificates
- private proposal recipients
- API provider errors containing request details

Private resource locations are provided through server-side environment variables and exposed to clients only through approved authenticated workflows.

## Execution gates

| Gate | Default | Effect |
|---|---:|---|
| `ADMIN_UI_AUTH_ENABLED` | `false` | When enabled, administrative pages require configured Basic authentication as an interim protection layer. |
| `PIPELINE_EXECUTION_ENABLED` | `false` | When false, cron and pipeline dry runs perform no external work. |
| `OUTBOUND_ENABLED` | `false` | When false, no email is sent even if a proposal is approved. |
| Approval signature | Required | HMAC evidence binds fulfillment ID to approval timestamp. |
| Suppression check | Required | Prevents sending to suppressed recipients. |
| Active outbound uniqueness | Required by migration | Prevents multiple queued or sent records for one fulfillment. |

## AI boundary

Takeoff and plan analysis require either the pipeline secret or authenticated operator access. Inputs are bounded. Plan documents are treated as untrusted data, not instructions. Provider errors are converted to stable internal error codes. AI output is parsed as JSON and checked for an object shape before returning.

## Service worker boundary

Only immutable public assets may be cached. API responses, proposals, approvals, accounts, and uploaded document data are network-only. Background proposal replay is disabled until an encrypted, authenticated, idempotent offline protocol is approved.

## Migration order

1. Verify the existing autonomous pipeline migration and live schema.
2. Apply the national extension in a non-production environment.
3. Run state-count, foreign-key, RLS, orphan, and assignment-gate tests.
4. Apply security hardening after active-outbound duplicate preflight.
5. Rehearse both rollback scripts.
6. Promote only after receipts and explicit approval.

## Donor repository disposition

The donor repository remains available as evidence until:

- every accepted capability is mapped to a canonical file or table
- preview tests pass
- the national migration is validated
- private resource references are verified outside source control
- the canonical pull request is merged

Only then should the donor repository be archived. Deletion is not required and is not part of this branch.
