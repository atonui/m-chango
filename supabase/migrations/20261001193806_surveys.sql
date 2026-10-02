create table private.fundraiser_surveys (
 fundraiser_id uuid primary key references public.fundraisers(id) on delete cascade,
 actor_user_id uuid not null references public.profiles(id),
 outcome text not null check(outcome in ('achieved','partly_achieved','not_achieved','prefer_not_to_say')),
 feedback text check(length(feedback)<=2000),
 updated_at timestamptz not null default now(),
 feedback_expires_at timestamptz not null default(now()+interval '180 days')
);
create index surveys_actor on private.fundraiser_surveys(actor_user_id);
alter table private.fundraiser_surveys enable row level security;
revoke all on private.fundraiser_surveys from public,anon,authenticated;
create function private.save_closing_survey(pid text,selected_outcome text,feedback_text text) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare f public.fundraisers; actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 select x.* into f from public.fundraisers x join public.fundraiser_members m on m.fundraiser_id=x.id
 where x.public_id=pid and m.user_id=actor for update of x;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if f.status<>'closed' then raise sqlstate 'PT409' using message='Close the fundraiser before completing this optional survey'; end if;
 if selected_outcome is null or selected_outcome not in ('achieved','partly_achieved','not_achieved','prefer_not_to_say') or length(feedback_text)>2000 then
  raise sqlstate 'PT422' using message='Review the survey values'; end if;
 insert into private.fundraiser_surveys(fundraiser_id,actor_user_id,outcome,feedback,updated_at,feedback_expires_at)
 values(f.id,actor,selected_outcome,nullif(trim(feedback_text),''),clock_timestamp(),clock_timestamp()+interval '180 days')
 on conflict(fundraiser_id) do update set actor_user_id=excluded.actor_user_id,outcome=excluded.outcome,
 feedback=excluded.feedback,updated_at=excluded.updated_at,feedback_expires_at=excluded.feedback_expires_at;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.save_closing_survey(text,text,text) from public,anon;
grant execute on function private.save_closing_survey(text,text,text) to authenticated;
create function public.save_closing_survey(public_id text,outcome text,feedback text default null) returns jsonb
language sql security invoker set search_path=''
as $$ select private.save_closing_survey(public_id,outcome,feedback) $$;
revoke all on function public.save_closing_survey(text,text,text) from public,anon;
grant execute on function public.save_closing_survey(text,text,text) to authenticated;
-- Admin-only maintenance. Schedule only after the operational configuration is verified.
create function private.expire_survey_feedback(as_of timestamptz default now()) returns bigint
language plpgsql security invoker set search_path=''
as $$ declare affected bigint; begin
 update private.fundraiser_surveys set feedback=null where feedback is not null and feedback_expires_at<=as_of;
 get diagnostics affected=row_count;
 return affected;
end $$;
revoke all on function private.expire_survey_feedback(timestamptz) from public,anon,authenticated;
