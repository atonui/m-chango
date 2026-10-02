create function private.ensure_organizer_profile() returns uuid
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 perform private.require_active_session();
 insert into public.profiles(auth_subject) values(auth.uid()) on conflict(auth_subject) do nothing;
 select id into strict actor from public.profiles where auth_subject=auth.uid();
 return actor;
end $$;
revoke all on function private.ensure_organizer_profile() from public,anon;
grant execute on function private.ensure_organizer_profile() to authenticated;
create function public.ensure_organizer_profile() returns uuid language sql security invoker set search_path=''
as $$ select private.ensure_organizer_profile() $$;
revoke all on function public.ensure_organizer_profile() from public,anon;
grant execute on function public.ensure_organizer_profile() to authenticated;
