create or replace function private.admin_overview() returns jsonb
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
   'pendingDeletionRequests',(select count(*) from private.account_deletion_requests where status='pending'),
   'totalContributionsMinor',(select coalesce(sum(amount_minor),0) from public.contributions where removed_at is null)
  )
 );
 return result;
end $$;
