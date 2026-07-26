-- Rollback for 20260726_bidgenius_national_extension.sql
-- Destructive. Run only with explicit operator approval and a verified backup.

begin;

drop table if exists public.bidgenius_subcontractor_assignments cascade;
drop table if exists public.bidgenius_contractor_assignments cascade;
drop table if exists public.bidgenius_subcontractor_compliance cascade;
drop table if exists public.bidgenius_subcontractor_state_coverage cascade;
drop table if exists public.bidgenius_subcontractors cascade;
drop table if exists public.bidgenius_contractor_state_coverage cascade;
drop table if exists public.bidgenius_contractor_profiles cascade;
drop table if exists public.bidgenius_sync_checkpoints cascade;
drop table if exists public.bidgenius_validation_receipts cascade;
drop table if exists public.bidgenius_state_registry cascade;
drop function if exists public.bidgenius_touch_updated_at() cascade;

commit;
