-- BidGenius Eastern US autonomous bid factory
-- Branch-safe migration artifact. Apply only after explicit database approval.

create extension if not exists pgcrypto;

create table if not exists public.bidgenius_contractors (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  company_name text not null,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  category text,
  source text,
  source_url text,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'discovered' check (status in ('discovered','qualified','rejected','failed')),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bidgenius_contractors_state_city_idx on public.bidgenius_contractors(state, city);
create index if not exists bidgenius_contractors_status_score_idx on public.bidgenius_contractors(status, score desc);
create index if not exists bidgenius_contractors_email_idx on public.bidgenius_contractors(lower(email));

create table if not exists public.bidgenius_opportunities (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  source_name text not null,
  source_url text,
  title text not null,
  description text,
  agency text,
  contact_name text,
  contact_email text,
  contact_phone text,
  location text,
  city text,
  state text,
  due_date timestamptz,
  posted_date timestamptz,
  estimated_value numeric,
  documents jsonb not null default '[]'::jsonb,
  score integer not null default 0 check (score between 0 and 100),
  status text not null default 'discovered' check (status in ('discovered','qualified','fulfilling','review_pending','approved','revision_requested','rejected','sent','failed')),
  last_error text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bidgenius_opportunities_state_due_idx on public.bidgenius_opportunities(state, due_date);
create index if not exists bidgenius_opportunities_status_score_idx on public.bidgenius_opportunities(status, score desc);

create table if not exists public.bidgenius_fulfillments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.bidgenius_opportunities(id) on delete set null,
  opportunity_fingerprint text not null,
  company text not null check (company in ('ncp','nep')),
  proposal_number text,
  proposal_html text not null,
  parsed jsonb not null default '{}'::jsonb,
  total numeric,
  confidence numeric,
  status text not null default 'review_pending' check (status in ('review_pending','approved','revision_requested','rejected','sent','failed')),
  approved_by text,
  approved_at timestamptz,
  approval_signature text,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bidgenius_fulfillments_status_created_idx on public.bidgenius_fulfillments(status, created_at desc);
create index if not exists bidgenius_fulfillments_approved_idx on public.bidgenius_fulfillments(status, approved_at) where status = 'approved';

create table if not exists public.bidgenius_reviews (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.bidgenius_fulfillments(id) on delete cascade,
  decision text not null check (decision in ('approve','revise','reject')),
  reviewer text not null,
  notes text,
  decided_at timestamptz not null default now(),
  approval_signature text
);

create index if not exists bidgenius_reviews_fulfillment_idx on public.bidgenius_reviews(fulfillment_id, decided_at desc);

create table if not exists public.bidgenius_outbound (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.bidgenius_fulfillments(id) on delete cascade,
  recipient_email text not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('queued','sent','delivered','bounced','complained','failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  approved_by text,
  approval_signature text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bidgenius_outbound_status_idx on public.bidgenius_outbound(status, created_at desc);
create index if not exists bidgenius_outbound_recipient_idx on public.bidgenius_outbound(lower(recipient_email));

create table if not exists public.bidgenius_suppression (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  reason text not null,
  source text,
  suppressed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.bidgenius_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  phase text not null,
  status text not null check (status in ('running','complete','failed','blocked')),
  territory text,
  discovered integer,
  qualified integer,
  fulfilled integer,
  reviewed integer,
  sent integer,
  duration_ms integer,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bidgenius_pipeline_runs_phase_created_idx on public.bidgenius_pipeline_runs(phase, created_at desc);

alter table public.bidgenius_contractors enable row level security;
alter table public.bidgenius_opportunities enable row level security;
alter table public.bidgenius_fulfillments enable row level security;
alter table public.bidgenius_reviews enable row level security;
alter table public.bidgenius_outbound enable row level security;
alter table public.bidgenius_suppression enable row level security;
alter table public.bidgenius_pipeline_runs enable row level security;

-- No public policies are created. The pipeline operates server-side with the Supabase service role.
-- Add explicit authenticated admin policies only after the final auth model is approved.
