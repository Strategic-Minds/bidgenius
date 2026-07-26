-- BidGenius security and concurrency hardening
-- Apply only after backup, duplicate preflight and explicit operator approval.
-- This migration intentionally fails if active duplicate outbound records already exist.

begin;

-- Fast duplicate preflight. Existing duplicates must be investigated, not silently deleted.
do $$
begin
  if exists (
    select 1
    from public.bidgenius_outbound
    where status in ('queued','sent','delivered')
    group by fulfillment_id
    having count(*) > 1
  ) then
    raise exception 'ACTIVE_OUTBOUND_DUPLICATES_FOUND';
  end if;
end;
$$;

create unique index if not exists bidgenius_outbound_one_active_per_fulfillment_idx
  on public.bidgenius_outbound(fulfillment_id)
  where status in ('queued','sent','delivered');

create index if not exists bidgenius_fulfillments_opportunity_status_idx
  on public.bidgenius_fulfillments(opportunity_fingerprint,status,created_at desc);

create or replace function public.bidgenius_enforce_fulfillment_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status in ('approved','sent') then
    if new.approved_by is null or new.approved_at is null or coalesce(new.approval_signature,'') = '' then
      raise exception 'APPROVAL_EVIDENCE_REQUIRED';
    end if;
  end if;

  if new.status = 'sent' and new.sent_at is null then
    raise exception 'SENT_TIMESTAMP_REQUIRED';
  end if;

  if tg_op = 'UPDATE' and old.status = 'sent' and new.status <> 'sent' then
    raise exception 'SENT_FULFILLMENT_IS_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and old.approval_signature is not null and new.approval_signature is distinct from old.approval_signature then
    if old.status in ('approved','sent') then
      raise exception 'APPROVAL_SIGNATURE_IS_IMMUTABLE';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bidgenius_fulfillment_transition_guard on public.bidgenius_fulfillments;
create trigger bidgenius_fulfillment_transition_guard
before insert or update on public.bidgenius_fulfillments
for each row execute function public.bidgenius_enforce_fulfillment_transition();

create or replace function public.bidgenius_enforce_outbound_evidence()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  fulfillment public.bidgenius_fulfillments%rowtype;
begin
  select * into fulfillment
  from public.bidgenius_fulfillments
  where id = new.fulfillment_id;

  if not found then
    raise exception 'FULFILLMENT_NOT_FOUND';
  end if;

  if fulfillment.status not in ('approved','sent') then
    raise exception 'FULFILLMENT_NOT_APPROVED';
  end if;

  if coalesce(new.approval_signature,'') = '' or new.approval_signature is distinct from fulfillment.approval_signature then
    raise exception 'OUTBOUND_APPROVAL_SIGNATURE_MISMATCH';
  end if;

  if new.approved_by is distinct from fulfillment.approved_by then
    raise exception 'OUTBOUND_APPROVER_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists bidgenius_outbound_evidence_guard on public.bidgenius_outbound;
create trigger bidgenius_outbound_evidence_guard
before insert or update on public.bidgenius_outbound
for each row execute function public.bidgenius_enforce_outbound_evidence();

-- Link assignment receipts to the durable validation receipt table after all extension tables exist.
do $$
begin
  if to_regclass('public.bidgenius_contractor_assignments') is not null
     and to_regclass('public.bidgenius_validation_receipts') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'bidgenius_contractor_assignment_receipt_fk'
     ) then
    alter table public.bidgenius_contractor_assignments
      add constraint bidgenius_contractor_assignment_receipt_fk
      foreign key (approval_receipt_id)
      references public.bidgenius_validation_receipts(id)
      on delete set null;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.bidgenius_subcontractor_assignments') is not null
     and to_regclass('public.bidgenius_validation_receipts') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'bidgenius_subcontractor_assignment_receipt_fk'
     ) then
    alter table public.bidgenius_subcontractor_assignments
      add constraint bidgenius_subcontractor_assignment_receipt_fk
      foreign key (approval_receipt_id)
      references public.bidgenius_validation_receipts(id)
      on delete set null;
  end if;
end;
$$;

commit;
