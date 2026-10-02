-- Administrator/cron only. Sole-owner MVP: delete owned fundraisers before profile/auth.
create table private.deletion_receipts (
 id uuid primary key default gen_random_uuid(),
 completed_at timestamptz not null default now(),
 fundraiser_count integer not null
);
alter table private.deletion_receipts enable row level security;
revoke all on private.deletion_receipts from public,anon,authenticated;
create function private.process_account_deletions(batch_size integer default 10) returns integer
language plpgsql security invoker set search_path=''
as $$ declare request record; subject uuid; affected integer; completed integer:=0; begin
 if batch_size is null or batch_size not between 1 and 100 then raise exception 'Invalid deletion batch size'; end if;
 for request in select user_id from private.account_deletion_requests where status in ('pending','processing')
  order by requested_at for update skip locked limit batch_size loop
  select auth_subject into subject from public.profiles where id=request.user_id for update;
  -- Never delete another owner's records if membership semantics change later.
  if exists(select 1 from public.operations o where o.actor_user_id=request.user_id and not exists(select 1 from public.fundraiser_members m where m.fundraiser_id=o.fundraiser_id and m.user_id=request.user_id))
   or exists(select 1 from public.history h where h.actor_user_id=request.user_id and not exists(select 1 from public.fundraiser_members m where m.fundraiser_id=h.fundraiser_id and m.user_id=request.user_id)) then
   raise exception 'Deletion requires review of shared records'; end if;
  delete from public.fundraisers f using public.fundraiser_members m where m.fundraiser_id=f.id and m.user_id=request.user_id;
  get diagnostics affected=row_count;
  delete from public.profiles where id=request.user_id;
  -- Supabase Auth foreign keys cascade identities, refresh tokens and sessions.
  -- Old JWTs cannot resolve an app profile or recreate one without auth.users.
  delete from auth.users where id=subject;
  insert into private.deletion_receipts(fundraiser_count) values(affected);
  completed:=completed+1;
 end loop;
 return completed;
end $$;
revoke all on function private.process_account_deletions(integer) from public,anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('m-chango-account-deletion','*/5 * * * *','select private.process_account_deletions(10)');
select cron.schedule('m-chango-data-retention','15 0 * * *',$job$
 select private.expire_product_events();
 select private.expire_survey_feedback();
 delete from private.deletion_receipts where completed_at < now()-interval '90 days';
$job$);
select cron.schedule('m-chango-cron-log-retention','30 0 * * *',$job$
 delete from cron.job_run_details where end_time < now()-interval '30 days'
 and jobid in(select jobid from cron.job where jobname like 'm-chango-%');
$job$);
