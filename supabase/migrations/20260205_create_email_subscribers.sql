-- Newsletter / email list subscriptions
create table if not exists public.email_subscribers (
  email text primary key,
  source text,
  created_at timestamptz not null default now()
);

comment on table public.email_subscribers is 'Marketing / newsletter email subscriptions (opt-in).';
comment on column public.email_subscribers.email is 'Lowercased subscriber email (primary key).';
comment on column public.email_subscribers.source is 'Capture point e.g. footer, modal.';

-- Keep the table private by default; only service_role inserts via API route.
revoke all on table public.email_subscribers from anon, authenticated;
