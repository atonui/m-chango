create table private.privacy_notice_configuration (singleton boolean primary key default true check(singleton),ready boolean not null default false);
insert into private.privacy_notice_configuration(singleton) values(true);
alter table private.privacy_notice_configuration enable row level security;
revoke all on private.privacy_notice_configuration from public,anon,authenticated;
create or replace function private.save_privacy_choices(research_choice boolean,marketing_choice boolean,version text) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 if actor is null then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 if research_choice is null or marketing_choice is null or version<>'2026-10-01' or version is null then raise sqlstate 'PT422' using message='Review privacy choices and notice version'; end if;
 if (research_choice or marketing_choice) and not (select ready from private.privacy_notice_configuration where singleton) then raise sqlstate 'PT422' using message='Privacy notice is not ready for opt-ins'; end if;
 insert into private.privacy_choices(user_id,research,marketing,notice_version,updated_at)
 values(actor,research_choice,marketing_choice,version,clock_timestamp())
 on conflict(user_id) do update set research=excluded.research,marketing=excluded.marketing,notice_version=excluded.notice_version,updated_at=excluded.updated_at;
 insert into private.privacy_choice_history(user_id,research,marketing,notice_version) values(actor,research_choice,marketing_choice,version);
 return jsonb_build_object('research',research_choice,'marketing',marketing_choice,'noticeVersion',version);
end $$;
create or replace function private.account_controls(operation text) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare actor public.profiles; result jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select * into actor from public.profiles where auth_subject=auth.uid();
 if not found then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 if operation='choices' then
  select jsonb_build_object('research',research,'marketing',marketing,'noticeVersion',notice_version) into result
  from private.privacy_choices where user_id=actor.id;
  return coalesce(result,jsonb_build_object('research',false,'marketing',false,'noticeVersion','2026-10-01')) || jsonb_build_object('noticeReady',(select ready from private.privacy_notice_configuration where singleton));
 elsif operation='export' then
  if (select count(*) from (select 1 from public.fundraiser_members where user_id=actor.id limit 51) bounded)>50 or
   (select count(*) from (select 1 from public.contributions c join public.fundraiser_members m on m.fundraiser_id=c.fundraiser_id where m.user_id=actor.id limit 5001) bounded)>5000 or
   (select count(*) from (select 1 from public.history h join public.fundraiser_members m on m.fundraiser_id=h.fundraiser_id where m.user_id=actor.id limit 50001) bounded)>50000 or
   (select count(*) from (select 1 from private.privacy_choice_history where user_id=actor.id limit 50001) bounded)>50000 or
   (select count(*) from (select 1 from private.fundraiser_surveys where actor_user_id=actor.id limit 50001) bounded)>50000 or
   (select count(*) from (select 1 from private.product_events where actor_user_id=actor.id limit 50001) bounded)>50000 then
   raise sqlstate 'PT422' using message='Account is too large for synchronous export; request an assisted export'; end if;
  return jsonb_build_object('profile',jsonb_build_object('id',actor.id,'displayName',actor.display_name,'createdAt',actor.created_at),
   'fundraisers',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from public.fundraisers f join public.fundraiser_members m on m.fundraiser_id=f.id where m.user_id=actor.id),
   'contributions',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.contributions c join public.fundraiser_members m on m.fundraiser_id=c.fundraiser_id where m.user_id=actor.id),
   'history',(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from public.history h join public.fundraiser_members m on m.fundraiser_id=h.fundraiser_id where m.user_id=actor.id),
   'privacyChoices',(select to_jsonb(p) from private.privacy_choices p where p.user_id=actor.id),
   'privacyHistory',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from private.privacy_choice_history p where p.user_id=actor.id),
   'surveys',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from private.fundraiser_surveys s where s.actor_user_id=actor.id),
   'events',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from private.product_events e where e.actor_user_id=actor.id));
 end if;
 raise sqlstate 'PT422' using message='Unsupported account operation';
end $$;
create or replace function private.request_account_deletion() returns jsonb
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 if actor is null then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 insert into private.account_deletion_requests(user_id) values(actor) on conflict(user_id) do nothing;
 return (select jsonb_build_object('status',status) from private.account_deletion_requests where user_id=actor);
end $$;
