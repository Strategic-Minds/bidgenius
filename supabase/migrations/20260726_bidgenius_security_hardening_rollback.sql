-- Rollback for 20260726_bidgenius_security_hardening.sql
-- Run only with explicit operator approval.

begin;

alter table if exists public.bidgenius_contractor_assignments
  drop constraint if exists bidgenius_contractor_assignment_receipt_fk;

alter table if exists public.bidgenius_subcontractor_assignments
  drop constraint if exists bidgenius_subcontractor_assignment_receipt_fk;

drop trigger if exists bidgenius_outbound_evidence_guard on public.bidgenius_outbound;
drop function if exists public.bidgenius_enforce_outbound_evidence();

drop trigger if exists bidgenius_fulfillment_transition_guard on public.bidgenius_fulfillments;
drop function if exists public.bidgenius_enforce_fulfillment_transition();

drop index if exists public.bidgenius_outbound_one_active_per_fulfillment_idx;
drop index if exists public.bidgenius_fulfillments_opportunity_status_idx;

commit;
