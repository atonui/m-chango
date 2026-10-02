-- Source for the account foundation migration; applied only to m-chango-dev.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key default gen_random_uuid(),
 auth_subject uuid not null unique references auth.users(id),
 display_name text not null default '',
 created_at timestamptz not null default now()
);
create table public.fundraisers (
 id uuid primary key default gen_random_uuid(),
 public_id text not null unique default replace(gen_random_uuid()::text,'-',''),
 title text not null check (length(title) between 1 and 160),
 purpose text not null default '' check (length(purpose)<=2000),
 payment_number text not null,
 target_minor bigint check (target_minor between 1 and 10000000000),
 public_names_enabled boolean not null default false,
 status text not null default 'active' check (status in ('active','closed')),
 category text check (category in ('medical','education','bereavement','community','other')),
 county text,
 total_minor bigint not null default 0 check (total_minor between 0 and 9007199254740991),
 entry_count bigint not null default 0 check (entry_count>=0),
 record_version bigint not null default 1 check (record_version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.fundraiser_members (
 fundraiser_id uuid primary key references public.fundraisers(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 role text not null default 'owner' check (role='owner'),
 created_at timestamptz not null default now()
);
create index fundraiser_members_user on public.fundraiser_members(user_id,fundraiser_id);
create index fundraisers_updated on public.fundraisers(updated_at desc,id desc);
create table public.contributions (
 id uuid primary key default gen_random_uuid(),
 fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 160),
 amount_minor bigint not null check (amount_minor between 1 and 10000000000),
 transaction_reference text,
 private_phone text,
 received_at timestamptz,
 source text not null check (source in ('manual','whatsapp','mpesa')),
 hide_name boolean not null default true,
 removed_at timestamptz,
 record_version bigint not null default 1 check (record_version>0),
 recorded_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(fundraiser_id,transaction_reference)
);
create index contributions_cursor on public.contributions(fundraiser_id,recorded_at desc,id desc);
create table public.operations (
 id uuid primary key default gen_random_uuid(),
 fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
 actor_user_id uuid not null references public.profiles(id),
 idempotency_key text not null check (length(idempotency_key) between 1 and 160),
 digest text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 unique(fundraiser_id,actor_user_id,idempotency_key)
);
create index operations_actor on public.operations(actor_user_id);
create table public.history (
 id uuid primary key default gen_random_uuid(),
 fundraiser_id uuid not null references public.fundraisers(id) on delete cascade,
 contribution_id uuid references public.contributions(id),
 actor_user_id uuid not null references public.profiles(id),
 action text not null check (action in ('create','add','edit','remove','restore','settings')),
 previous_value jsonb,
 new_value jsonb,
 created_at timestamptz not null default now()
);
create index history_fundraiser on public.history(fundraiser_id,created_at desc,id desc);
create index history_actor on public.history(actor_user_id);
create index history_contribution on public.history(contribution_id);

-- Private helper avoids recursive membership policies and uses database identity.
create function private.owns_fundraiser(fid uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select exists (
 select 1 from public.fundraiser_members m join public.profiles p on p.id=m.user_id
 where m.fundraiser_id=fid and p.auth_subject=(select auth.uid())
) $$;
revoke all on function private.owns_fundraiser(uuid) from public,anon;
grant execute on function private.owns_fundraiser(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.fundraisers enable row level security;
alter table public.fundraiser_members enable row level security;
alter table public.contributions enable row level security;
alter table public.operations enable row level security;
alter table public.history enable row level security;
revoke all on public.profiles,public.fundraisers,public.fundraiser_members,
 public.contributions,public.operations,public.history from anon,authenticated;
grant select on public.profiles,public.fundraisers,public.fundraiser_members,
 public.contributions,public.history to authenticated;
create policy own_profile on public.profiles for select to authenticated using(auth_subject=(select auth.uid()));
create policy owner_fundraisers on public.fundraisers for select to authenticated using(private.owns_fundraiser(id));
create policy own_membership on public.fundraiser_members for select to authenticated using(user_id in(select id from public.profiles));
create policy owner_contributions on public.contributions for select to authenticated using(private.owns_fundraiser(fundraiser_id));
create policy owner_history on public.history for select to authenticated using(private.owns_fundraiser(fundraiser_id));
