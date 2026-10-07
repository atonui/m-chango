create table private.analytics_configuration (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into private.analytics_configuration(singleton,enabled) values(true,false);
create table private.product_events (
 id uuid primary key,
 event_name text not null check(event_name in ('fundraiser_created','contribution_added','import_completed','contribution_list_copied','public_fundraiser_viewed','fundraiser_closed')),
 actor_user_id uuid references public.profiles(id) on delete cascade,
 fundraiser_id uuid references public.fundraisers(id) on delete cascade,
 source text check(source in ('manual','whatsapp','mpesa')),
 row_count integer check(row_count between 1 and 500),
 occurred_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '90 days'),
 constraint product_events_payload_check check(
  (event_name='import_completed' and source in ('manual','whatsapp','mpesa') and row_count between 1 and 500)
  or (event_name='contribution_added' and source in ('manual','whatsapp','mpesa') and row_count is null)
  or (event_name not in ('import_completed','contribution_added') and source is null and row_count is null)
 )
);
create index product_events_actor on private.product_events(actor_user_id);
create index product_events_fundraiser on private.product_events(fundraiser_id);
create index product_events_expiry on private.product_events(expires_at);
alter table private.analytics_configuration enable row level security;
alter table private.product_events enable row level security;
revoke all on private.analytics_configuration,private.product_events from public,anon,authenticated;
create function private.analytics_enabled() returns boolean
language sql stable security definer set search_path=''
as $$ select coalesce((select enabled from private.analytics_configuration where singleton),false) $$;
revoke all on function private.analytics_enabled() from public,anon,authenticated;

create function private.record_product_event(public_id text,event_name text,source text default null,row_count integer default null) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare fid uuid; actor uuid;
begin
 if not private.analytics_enabled() then return jsonb_build_object('recorded',false); end if;
 perform private.require_active_session();
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select p.id into actor from public.profiles p where p.auth_subject=auth.uid();
 select f.id into fid from public.fundraisers f join public.fundraiser_members m on m.fundraiser_id=f.id
 where f.public_id=record_product_event.public_id and m.user_id=actor;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 insert into private.product_events(id,event_name,actor_user_id,fundraiser_id,source,row_count)
 values(gen_random_uuid(),event_name,actor,fid,source,row_count);
 return jsonb_build_object('recorded',true);
end $$;
revoke all on function private.record_product_event(text,text,text,integer) from public,anon;
grant execute on function private.record_product_event(text,text,text,integer) to authenticated;
create function public.record_product_event(public_id text,event_name text,source text default null,row_count integer default null) returns jsonb
language sql security invoker set search_path=''
as $$ select private.record_product_event(public_id,event_name,source,row_count) $$;
revoke all on function public.record_product_event(text,text,text,integer) from public,anon;
grant execute on function public.record_product_event(text,text,text,integer) to authenticated;

create function private.record_public_product_event(public_id text,event_name text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare fid uuid;
begin
 if event_name not in ('contribution_list_copied','public_fundraiser_viewed') then raise sqlstate 'PT422' using message='Invalid analytics event'; end if;
 if not private.analytics_enabled() then return jsonb_build_object('recorded',false); end if;
 select f.id into fid from public.fundraisers f where f.public_id=record_public_product_event.public_id;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 insert into private.product_events(id,event_name,fundraiser_id) values(gen_random_uuid(),event_name,fid);
 return jsonb_build_object('recorded',true);
end $$;
revoke all on function private.record_public_product_event(text,text) from public;
grant execute on function private.record_public_product_event(text,text) to anon,authenticated;
create function public.record_public_product_event(public_id text,event_name text) returns jsonb
language sql security invoker set search_path=''
as $$ select private.record_public_product_event(public_id,event_name) $$;
revoke all on function public.record_public_product_event(text,text) from public;
grant execute on function public.record_public_product_event(text,text) to anon,authenticated;
create function private.expire_product_events(as_of timestamptz default now()) returns bigint
language plpgsql security invoker set search_path=''
as $$ declare affected bigint; begin
 delete from private.product_events where expires_at<=as_of;
 get diagnostics affected=row_count;
 return affected;
end $$;
revoke all on function private.expire_product_events(timestamptz) from public,anon,authenticated;
