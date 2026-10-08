create table private.admin_users (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 role text not null check(role in ('owner','support','analyst','ops')),
 created_at timestamptz not null default now(),
 created_by uuid references public.profiles(id),
 disabled_at timestamptz
);
create table private.admin_audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid not null references public.profiles(id) on delete cascade,
 action text not null check(length(action) between 1 and 120),
 target_type text check(target_type is null or length(target_type)<=80),
 target_id text check(target_id is null or length(target_id)<=160),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index admin_audit_events_actor on private.admin_audit_events(actor_user_id,created_at desc,id desc);
alter table private.admin_users enable row level security;
alter table private.admin_audit_events enable row level security;
revoke all on private.admin_users,private.admin_audit_events from public,anon,authenticated;

create function private.require_admin(required_role text default null) returns uuid
language plpgsql stable security definer set search_path=''
as $$ declare actor uuid; admin_role text; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 if not private.active_organizer_session() then raise sqlstate 'PT401' using message='Active organizer session required'; end if;
 select p.id,a.role into actor,admin_role
 from public.profiles p join private.admin_users a on a.user_id=p.id
 where p.auth_subject=auth.uid() and a.disabled_at is null;
 if actor is null then raise sqlstate 'PT403' using message='Admin access required'; end if;
 if required_role is not null and admin_role<>required_role then raise sqlstate 'PT403' using message='Admin role required'; end if;
 return actor;
end $$;
revoke all on function private.require_admin(text) from public,anon;
grant execute on function private.require_admin(text) to authenticated;

create function private.audit_metadata_safe(payload jsonb) returns boolean
language sql immutable set search_path=''
as $$ select coalesce(not exists(
 select 1 from jsonb_object_keys(coalesce(payload,'{}'::jsonb)) key
 where lower(key) in ('phone','phonenumber','transactionreference','rawtext','token','cookie','authorization')
),true) $$;
revoke all on function private.audit_metadata_safe(jsonb) from public,anon,authenticated;

create function private.record_admin_audit(action text,target_type text default null,target_id text default null,metadata jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 actor:=private.require_admin();
 if action is null or length(action)=0 or length(action)>120 then raise sqlstate 'PT422' using message='Invalid admin action'; end if;
 if metadata is null or jsonb_typeof(metadata)<>'object' or not private.audit_metadata_safe(metadata) then raise sqlstate 'PT422' using message='Unsafe admin audit metadata'; end if;
 insert into private.admin_audit_events(actor_user_id,action,target_type,target_id,metadata)
 values(actor,action,target_type,target_id,metadata);
end $$;
revoke all on function private.record_admin_audit(text,text,text,jsonb) from public,anon;
grant execute on function private.record_admin_audit(text,text,text,jsonb) to authenticated;

create function private.admin_overview() returns jsonb
language plpgsql security definer set search_path=''
as $$ declare actor uuid; admin_role text; result jsonb; begin
 actor:=private.require_admin('owner');
 select role into admin_role from private.admin_users where user_id=actor;
 perform private.record_admin_audit('admin.overview.view','admin','overview','{"section":"overview"}');
 result:=jsonb_build_object(
  'role',admin_role,
  'environment',jsonb_build_object(),
  'counts',jsonb_build_object(
   'fundraisers',(select count(*) from public.fundraisers),
   'profiles',(select count(*) from public.profiles),
   'pendingDeletionRequests',(select count(*) from private.account_deletion_requests where status='pending')
  )
 );
 return result;
end $$;
revoke all on function private.admin_overview() from public,anon;
grant execute on function private.admin_overview() to authenticated;

create function public.admin_overview() returns jsonb
language sql security invoker set search_path=''
as $$ select private.admin_overview() $$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;
