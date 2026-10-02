create table private.account_deletion_requests (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','processing','completed'))
);
alter table private.account_deletion_requests enable row level security;
revoke all on private.account_deletion_requests from public,anon,authenticated;
create function private.account_controls(operation text) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare actor public.profiles; result jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select * into actor from public.profiles where auth_subject=auth.uid();
 if not found then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 if operation='choices' then
  select jsonb_build_object('research',research,'marketing',marketing,'noticeVersion',notice_version) into result
  from private.privacy_choices where user_id=actor.id;
  return coalesce(result,jsonb_build_object('research',false,'marketing',false,'noticeVersion','2026-10-01'));
 elsif operation='export' then
  if (select count(*) from public.fundraiser_members where user_id=actor.id)>50 or
   (select count(*) from public.contributions c join public.fundraiser_members m on m.fundraiser_id=c.fundraiser_id where m.user_id=actor.id)>5000 or
   (select count(*) from public.history h join public.fundraiser_members m on m.fundraiser_id=h.fundraiser_id where m.user_id=actor.id)>50000 then
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
revoke all on function private.account_controls(text) from public,anon;
grant execute on function private.account_controls(text) to authenticated;
create function public.get_privacy_choices() returns jsonb language sql stable security invoker set search_path=''
as $$ select private.account_controls('choices') $$;
create function public.export_account_data() returns jsonb language sql stable security invoker set search_path=''
as $$ select private.account_controls('export') $$;
revoke all on function public.get_privacy_choices(),public.export_account_data() from public,anon;
grant execute on function public.get_privacy_choices(),public.export_account_data() to authenticated;
create function private.request_account_deletion() returns jsonb
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 if actor is null then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 insert into private.account_deletion_requests(user_id) values(actor) on conflict(user_id) do nothing;
 return jsonb_build_object('status','pending');
end $$;
revoke all on function private.request_account_deletion() from public,anon;
grant execute on function private.request_account_deletion() to authenticated;
create function public.request_account_deletion() returns jsonb language sql security invoker set search_path=''
as $$ select private.request_account_deletion() $$;
revoke all on function public.request_account_deletion() from public,anon;
grant execute on function public.request_account_deletion() to authenticated;
