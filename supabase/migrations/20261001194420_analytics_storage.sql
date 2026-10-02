create table private.analytics_configuration (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into private.analytics_configuration(singleton,enabled) values(true,false);
create table private.product_events (
 id uuid primary key,
 event_name text not null check(event_name in ('fundraiser_created','import_completed','contribution_list_copied','fundraiser_closed')),
 actor_user_id uuid references public.profiles(id) on delete cascade,
 fundraiser_id uuid references public.fundraisers(id) on delete cascade,
 source text check(source in ('manual','whatsapp','mpesa')),
 row_count integer check(row_count between 1 and 500),
 occurred_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '90 days'),
 check(event_name='import_completed' or (source is null and row_count is null))
);
create index product_events_actor on private.product_events(actor_user_id);
create index product_events_fundraiser on private.product_events(fundraiser_id);
create index product_events_expiry on private.product_events(expires_at);
alter table private.analytics_configuration enable row level security;
alter table private.product_events enable row level security;
revoke all on private.analytics_configuration,private.product_events from public,anon,authenticated;
-- No event-write RPC is exposed until notice/lawful-basis and authentication review.
create function private.expire_product_events(as_of timestamptz default now()) returns bigint
language plpgsql security invoker set search_path=''
as $$ declare affected bigint; begin
 delete from private.product_events where expires_at<=as_of;
 get diagnostics affected=row_count;
 return affected;
end $$;
revoke all on function private.expire_product_events(timestamptz) from public,anon,authenticated;
