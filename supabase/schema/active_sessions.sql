create function private.active_organizer_session() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=auth.uid() and not coalesce(u.is_anonymous,false)
 and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now())) $$;
revoke all on function private.active_organizer_session() from public,anon;
grant execute on function private.active_organizer_session() to authenticated;
create function private.require_active_session() returns void
language plpgsql stable security invoker set search_path=''
as $$ begin if not private.active_organizer_session() then raise sqlstate 'PT401' using message='Active organizer session required'; end if; end $$;
revoke all on function private.require_active_session() from public,anon;
grant execute on function private.require_active_session() to authenticated;
create function public.organizer_session_valid() returns boolean language sql stable security invoker set search_path=''
as $$ select private.active_organizer_session() $$;
revoke all on function public.organizer_session_valid() from public,anon;
grant execute on function public.organizer_session_valid() to authenticated;
-- Preserve the existing RPC definitions/grants while guarding every private public entry point.
do $$ declare fn record; definition text; begin
 for fn in select p.oid,l.lanname from pg_proc p join pg_language l on l.oid=p.prolang join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('create_fundraiser','commit_contributions','edit_contribution','set_contribution_removed','update_fundraiser','export_snapshot','list_owned_fundraisers','private_ledger_page','check_import_duplicates','save_closing_survey','get_privacy_choices','save_privacy_choices','export_account_data','request_account_deletion') loop
  definition:=pg_get_functiondef(fn.oid);
  if position('AS $function$' in definition)=0 then raise exception 'Unsupported RPC definition'; end if;
  if fn.lanname='sql' then
   execute replace(definition,'AS $function$','AS $function$ SELECT private.require_active_session();');
  elsif fn.lanname='plpgsql' then
   execute regexp_replace(definition,'\mbegin\M','begin perform private.require_active_session();','i');
  else raise exception 'Unsupported RPC language'; end if;
 end loop;
end $$;
create or replace function private.owns_fundraiser(fid uuid) returns boolean
language sql stable security definer set search_path=''
as $$ select private.active_organizer_session() and exists (
 select 1 from public.fundraiser_members m join public.profiles p on p.id=m.user_id
 where m.fundraiser_id=fid and p.auth_subject=(select auth.uid())
) $$;
alter policy own_profile on public.profiles using(auth_subject=(select auth.uid()) and (select private.active_organizer_session()));
