-- XTREME AI SYSTEMS / BidGenius national fulfillment extension
-- Branch-safe migration artifact. Do not apply without explicit database approval.
-- The existing bidgenius_contractors and bidgenius_opportunities tables remain canonical ingestion authority.

create extension if not exists pgcrypto;

create or replace function public.bidgenius_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.bidgenius_state_registry (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null unique,
  region text not null check (region in ('Northeast','Southeast','Midwest','Southwest','West')),
  operating_status text not null default 'active' check (operating_status in ('active','paused','blocked','archived')),
  compliance_status text not null default 'research_required' check (compliance_status in ('research_required','in_review','approved','blocked')),
  licensing_profile jsonb not null default '{}'::jsonb,
  procurement_profile jsonb not null default '{}'::jsonb,
  wage_profile jsonb not null default '{}'::jsonb,
  lien_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.bidgenius_state_registry (code,name,region) values
('AL','Alabama','Southeast'),('AK','Alaska','West'),('AZ','Arizona','Southwest'),('AR','Arkansas','Southeast'),
('CA','California','West'),('CO','Colorado','West'),('CT','Connecticut','Northeast'),('DE','Delaware','Southeast'),
('FL','Florida','Southeast'),('GA','Georgia','Southeast'),('HI','Hawaii','West'),('ID','Idaho','West'),
('IL','Illinois','Midwest'),('IN','Indiana','Midwest'),('IA','Iowa','Midwest'),('KS','Kansas','Midwest'),
('KY','Kentucky','Southeast'),('LA','Louisiana','Southeast'),('ME','Maine','Northeast'),('MD','Maryland','Southeast'),
('MA','Massachusetts','Northeast'),('MI','Michigan','Midwest'),('MN','Minnesota','Midwest'),('MS','Mississippi','Southeast'),
('MO','Missouri','Midwest'),('MT','Montana','West'),('NE','Nebraska','Midwest'),('NV','Nevada','West'),
('NH','New Hampshire','Northeast'),('NJ','New Jersey','Northeast'),('NM','New Mexico','Southwest'),('NY','New York','Northeast'),
('NC','North Carolina','Southeast'),('ND','North Dakota','Midwest'),('OH','Ohio','Midwest'),('OK','Oklahoma','Southwest'),
('OR','Oregon','West'),('PA','Pennsylvania','Northeast'),('RI','Rhode Island','Northeast'),('SC','South Carolina','Southeast'),
('SD','South Dakota','Midwest'),('TN','Tennessee','Southeast'),('TX','Texas','Southwest'),('UT','Utah','West'),
('VT','Vermont','Northeast'),('VA','Virginia','Southeast'),('WA','Washington','West'),('WV','West Virginia','Southeast'),
('WI','Wisconsin','Midwest'),('WY','Wyoming','West')
on conflict (code) do update set name = excluded.name, region = excluded.region, updated_at = now();

create table if not exists public.bidgenius_contractor_profiles (
  contractor_id uuid primary key references public.bidgenius_contractors(id) on delete cascade,
  xps_customer_status text not null default 'unverified' check (xps_customer_status in ('unverified','possible_match','matched','verified','not_customer','blocked')),
  consent_status text not null default 'unknown' check (consent_status in ('unknown','requested','granted','declined','revoked')),
  qualification_status text not null default 'unreviewed' check (qualification_status in ('unreviewed','in_review','qualified','conditional','rejected','suspended','archived')),
  assignment_status text not null default 'unavailable' check (assignment_status in ('unavailable','available','limited','assigned','suspended')),
  compliance_gate text not null default 'blocked' check (compliance_gate in ('blocked','conditional','passed','expired')),
  service_systems text[] not null default '{}',
  crew_capacity jsonb not null default '{}'::jsonb,
  equipment_capacity jsonb not null default '{}'::jsonb,
  purchase_history_summary jsonb not null default '{}'::jsonb,
  training_history jsonb not null default '[]'::jsonb,
  performance_summary jsonb not null default '{}'::jsonb,
  source_provenance jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    assignment_status <> 'assigned'
    or (qualification_status = 'qualified' and consent_status = 'granted' and compliance_gate = 'passed')
  )
);

create table if not exists public.bidgenius_contractor_state_coverage (
  contractor_id uuid not null references public.bidgenius_contractors(id) on delete cascade,
  state_code text not null references public.bidgenius_state_registry(code) on delete cascade,
  coverage_status text not null default 'claimed' check (coverage_status in ('claimed','verified','conditional','inactive')),
  travel_willingness text not null default 'unknown' check (travel_willingness in ('unknown','local_only','regional','national')),
  max_concurrent_projects integer not null default 0 check (max_concurrent_projects >= 0),
  evidence jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contractor_id,state_code)
);

create table if not exists public.bidgenius_subcontractors (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  legal_name text not null,
  dba_name text,
  entity_type text,
  primary_state_code text references public.bidgenius_state_registry(code),
  trade text not null,
  service_systems text[] not null default '{}',
  lifecycle_status text not null default 'lead' check (lifecycle_status in (
    'lead','invited','prequalification_in_progress','compliance_review','approved','bid_invited','quoted',
    'selected','contracted','mobilizing','active','punch','closeout','scored','archived','suspended','quarantined'
  )),
  consent_status text not null default 'unknown' check (consent_status in ('unknown','requested','granted','declined','revoked')),
  compliance_gate text not null default 'blocked' check (compliance_gate in ('blocked','conditional','passed','expired')),
  crew_capacity jsonb not null default '{}'::jsonb,
  equipment_capacity jsonb not null default '{}'::jsonb,
  annual_capacity numeric check (annual_capacity is null or annual_capacity >= 0),
  max_project_capacity numeric check (max_project_capacity is null or max_project_capacity >= 0),
  risk_flags text[] not null default '{}',
  source_provenance jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.bidgenius_subcontractor_state_coverage (
  subcontractor_id uuid not null references public.bidgenius_subcontractors(id) on delete cascade,
  state_code text not null references public.bidgenius_state_registry(code) on delete cascade,
  coverage_status text not null default 'claimed' check (coverage_status in ('claimed','verified','conditional','inactive')),
  license_required boolean,
  license_status text not null default 'not_checked' check (license_status in ('not_checked','valid','expiring','expired','not_required','invalid')),
  evidence jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  primary key (subcontractor_id,state_code)
);

create table if not exists public.bidgenius_subcontractor_compliance (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references public.bidgenius_subcontractors(id) on delete cascade,
  requirement_type text not null check (requirement_type in (
    'legal_identity','w9','general_liability','auto_liability','workers_comp','umbrella','bonding',
    'license','registration','osha','emr','safety_training','nda','msa','subcontract','debarment',
    'sanctions','e_verify','certified_payroll','prevailing_wage','other'
  )),
  jurisdiction text,
  status text not null default 'missing' check (status in ('missing','submitted','in_review','valid','expiring','expired','waived','rejected','blocked')),
  document_ref text,
  issued_at date,
  expires_at date,
  verified_at timestamptz,
  verified_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bidgenius_contractor_assignments (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.bidgenius_contractors(id) on delete cascade,
  opportunity_id uuid not null references public.bidgenius_opportunities(id) on delete cascade,
  state_code text not null references public.bidgenius_state_registry(code),
  assignment_role text not null default 'fulfillment_contractor',
  status text not null default 'proposed' check (status in ('proposed','invited','accepted','declined','assigned','mobilizing','active','completed','cancelled','suspended')),
  selection_score numeric not null default 0 check (selection_score between 0 and 100),
  selection_evidence jsonb not null default '{}'::jsonb,
  approval_receipt_id uuid,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id,opportunity_id,assignment_role),
  check (status <> 'assigned' or approval_receipt_id is not null)
);

create table if not exists public.bidgenius_subcontractor_assignments (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references public.bidgenius_subcontractors(id) on delete cascade,
  contractor_assignment_id uuid references public.bidgenius_contractor_assignments(id) on delete cascade,
  opportunity_id uuid not null references public.bidgenius_opportunities(id) on delete cascade,
  state_code text not null references public.bidgenius_state_registry(code),
  scope_summary text not null,
  status text not null default 'proposed' check (status in ('proposed','selected','contracted','mobilizing','active','punch','closeout','completed','suspended','terminated')),
  compliance_gate text not null default 'blocked' check (compliance_gate in ('blocked','conditional','passed','expired')),
  approval_receipt_id uuid,
  contract_value numeric not null default 0 check (contract_value >= 0),
  retainage_rate numeric not null default 0 check (retainage_rate between 0 and 1),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status not in ('contracted','mobilizing','active','punch','closeout','completed')
    or (compliance_gate = 'passed' and approval_receipt_id is not null)
  )
);

create table if not exists public.bidgenius_sync_checkpoints (
  id uuid primary key default gen_random_uuid(),
  consumer text not null,
  source_table text not null,
  last_updated_at timestamptz,
  last_fingerprint text,
  status text not null default 'idle' check (status in ('idle','running','complete','failed','blocked')),
  lock_id text,
  lock_expires_at timestamptz,
  rows_examined integer not null default 0 check (rows_examined >= 0),
  rows_promoted integer not null default 0 check (rows_promoted >= 0),
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consumer,source_table)
);

create table if not exists public.bidgenius_validation_receipts (
  id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  validator text not null,
  validation_type text not null,
  scope text not null,
  status text not null check (status in ('pass','fail','blocked','warning')),
  evidence jsonb not null default '{}'::jsonb,
  rollback_ref text,
  created_at timestamptz not null default now(),
  unique (correlation_id,validator,validation_type,scope)
);

create index if not exists bidgenius_profiles_qualification_idx on public.bidgenius_contractor_profiles(qualification_status,compliance_gate,assignment_status);
create index if not exists bidgenius_coverage_state_idx on public.bidgenius_contractor_state_coverage(state_code,coverage_status);
create index if not exists bidgenius_subcontractors_state_status_idx on public.bidgenius_subcontractors(primary_state_code,lifecycle_status,compliance_gate);
create index if not exists bidgenius_subcontractor_compliance_expiry_idx on public.bidgenius_subcontractor_compliance(status,expires_at);
create index if not exists bidgenius_contractor_assignments_status_idx on public.bidgenius_contractor_assignments(status,state_code,created_at desc);
create index if not exists bidgenius_subcontractor_assignments_status_idx on public.bidgenius_subcontractor_assignments(status,state_code,created_at desc);
create index if not exists bidgenius_sync_checkpoints_status_idx on public.bidgenius_sync_checkpoints(status,updated_at desc);
create index if not exists bidgenius_validation_receipts_created_idx on public.bidgenius_validation_receipts(status,created_at desc);

create or replace trigger bidgenius_state_registry_touch
before update on public.bidgenius_state_registry
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_contractor_profiles_touch
before update on public.bidgenius_contractor_profiles
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_contractor_coverage_touch
before update on public.bidgenius_contractor_state_coverage
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_subcontractors_touch
before update on public.bidgenius_subcontractors
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_subcontractor_compliance_touch
before update on public.bidgenius_subcontractor_compliance
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_contractor_assignments_touch
before update on public.bidgenius_contractor_assignments
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_subcontractor_assignments_touch
before update on public.bidgenius_subcontractor_assignments
for each row execute function public.bidgenius_touch_updated_at();
create or replace trigger bidgenius_sync_checkpoints_touch
before update on public.bidgenius_sync_checkpoints
for each row execute function public.bidgenius_touch_updated_at();

alter table public.bidgenius_state_registry enable row level security;
alter table public.bidgenius_contractor_profiles enable row level security;
alter table public.bidgenius_contractor_state_coverage enable row level security;
alter table public.bidgenius_subcontractors enable row level security;
alter table public.bidgenius_subcontractor_state_coverage enable row level security;
alter table public.bidgenius_subcontractor_compliance enable row level security;
alter table public.bidgenius_contractor_assignments enable row level security;
alter table public.bidgenius_subcontractor_assignments enable row level security;
alter table public.bidgenius_sync_checkpoints enable row level security;
alter table public.bidgenius_validation_receipts enable row level security;

-- No browser policies are created. Server-side service-role access only until the authenticated admin model is approved.
-- No source contractor record is copied or promoted by this migration. Profiles are created only through a governed sync or operator approval workflow.
