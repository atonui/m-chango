create function private.admin_operations() returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare result jsonb; begin
 perform private.require_admin();
 select jsonb_build_object(
  'privacy',jsonb_build_object(
   'pendingDeletionRequests',(select count(*) from private.account_deletion_requests where status='pending'),
   'processingDeletionRequests',(select count(*) from private.account_deletion_requests where status='processing'),
   'completedDeletionRequests',(select count(*) from private.account_deletion_requests where status='completed'),
   'privacyChoices',(select count(*) from private.privacy_choices),
   'researchOptIns',(select count(*) from private.privacy_choices where research),
   'marketingOptIns',(select count(*) from private.privacy_choices where marketing)
  ),
  'analytics',jsonb_build_object(
   'enabled',(select coalesce(enabled,false) from private.analytics_configuration where singleton),
   'eventsLast24h',(select count(*) from private.product_events where occurred_at>=now()-interval '24 hours'),
   'eventsLast7d',(select count(*) from private.product_events where occurred_at>=now()-interval '7 days'),
   'oldestEventExpiresAt',(select min(expires_at) from private.product_events)
  ),
  'retention',jsonb_build_object(
   'deletionReceipts',(select count(*) from private.deletion_receipts),
   'staleDeletionReceipts',(select count(*) from private.deletion_receipts where completed_at<now()-interval '90 days')
  ),
  'audit',(select coalesce(jsonb_agg(jsonb_build_object(
   'id',id,'action',action,'targetType',target_type,'targetId',target_id,'createdAt',created_at,'metadata',metadata
  ) order by created_at desc),'[]'::jsonb) from (
   select id,action,target_type,target_id,created_at,metadata from private.admin_audit_events order by created_at desc,id desc limit 10
  ) recent)
 ) into result;
 perform private.record_admin_audit('admin.operations.view','admin','operations','{"section":"operations"}');
 return result;
end $$;
revoke all on function private.admin_operations() from public,anon;
grant execute on function private.admin_operations() to authenticated;

create function public.admin_operations() returns jsonb
language sql security invoker set search_path=''
as $$ select private.admin_operations() $$;
revoke all on function public.admin_operations() from public,anon;
grant execute on function public.admin_operations() to authenticated;
