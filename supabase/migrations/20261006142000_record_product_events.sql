alter table private.product_events drop constraint if exists product_events_event_name_check;
alter table private.product_events add constraint product_events_event_name_check
check(event_name in ('fundraiser_created','contribution_added','import_completed','contribution_list_copied','public_fundraiser_viewed','fundraiser_closed'));

alter table private.product_events drop constraint if exists product_events_check;
alter table private.product_events drop constraint if exists product_events_payload_check;
alter table private.product_events add constraint product_events_payload_check check(
 (event_name='import_completed' and source in ('manual','whatsapp','mpesa') and row_count between 1 and 500)
 or (event_name='contribution_added' and source in ('manual','whatsapp','mpesa') and row_count is null)
 or (event_name not in ('import_completed','contribution_added') and source is null and row_count is null)
);

create or replace function private.analytics_enabled() returns boolean
language sql stable security definer set search_path=''
as $$ select coalesce((select enabled from private.analytics_configuration where singleton),false) $$;
revoke all on function private.analytics_enabled() from public,anon,authenticated;

create or replace function private.record_product_event(public_id text,event_name text,source text default null,row_count integer default null) returns jsonb
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

create or replace function public.record_product_event(public_id text,event_name text,source text default null,row_count integer default null) returns jsonb
language sql security invoker set search_path=''
as $$ select private.record_product_event(public_id,event_name,source,row_count) $$;
revoke all on function public.record_product_event(text,text,text,integer) from public,anon;
grant execute on function public.record_product_event(text,text,text,integer) to authenticated;

create or replace function private.record_public_product_event(public_id text,event_name text) returns jsonb
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

create or replace function public.record_public_product_event(public_id text,event_name text) returns jsonb
language sql security invoker set search_path=''
as $$ select private.record_public_product_event(public_id,event_name) $$;
revoke all on function public.record_public_product_event(text,text) from public;
grant execute on function public.record_public_product_event(text,text) to anon,authenticated;
