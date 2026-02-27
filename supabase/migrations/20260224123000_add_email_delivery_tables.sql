create table if not exists public.email_suppression (
  email text primary key,
  reason text not null,
  source text not null default 'resend_webhook',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.email_send_attempt (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  template text not null,
  recipient_email text not null,
  subject text not null,
  resend_email_id text null,
  status text not null default 'queued',
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint email_send_attempt_status_check check (
    status = any (
      array[
        'queued'::text,
        'sent'::text,
        'failed'::text,
        'suppressed'::text
      ]
    )
  )
);

create table if not exists public.email_event (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_event_id text null,
  type text not null,
  recipient_email text null,
  resend_email_id text null,
  payload jsonb not null,
  received_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone null,
  constraint email_event_provider_event_unique unique (provider, provider_event_id)
);

create index if not exists email_send_attempt_recipient_created_idx
  on public.email_send_attempt (recipient_email, created_at desc);

create index if not exists email_send_attempt_resend_email_id_idx
  on public.email_send_attempt (resend_email_id);

create index if not exists email_event_recipient_received_idx
  on public.email_event (recipient_email, received_at desc);

grant all on table public.email_suppression to anon;
grant all on table public.email_suppression to authenticated;
grant all on table public.email_suppression to service_role;

grant all on table public.email_send_attempt to anon;
grant all on table public.email_send_attempt to authenticated;
grant all on table public.email_send_attempt to service_role;

grant all on table public.email_event to anon;
grant all on table public.email_event to authenticated;
grant all on table public.email_event to service_role;
