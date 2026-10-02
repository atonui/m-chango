create table private.privacy_choices (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 research boolean not null default false,
 marketing boolean not null default false,
 notice_version text not null,
 updated_at timestamptz not null default now()
);
create table private.privacy_choice_history (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 research boolean not null,
 marketing boolean not null,
 notice_version text not null,
 recorded_at timestamptz not null default now()
);
create index privacy_history_user on private.privacy_choice_history(user_id,recorded_at desc);
alter table private.privacy_choices enable row level security;
alter table private.privacy_choice_history enable row level security;
revoke all on private.privacy_choices,private.privacy_choice_history from public,anon,authenticated;
create function private.save_privacy_choices(research_choice boolean,marketing_choice boolean,version text) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 if actor is null then raise sqlstate 'PT401' using message='Organizer profile required'; end if;
 if research_choice is null or marketing_choice is null or version<>'2026-10-01' or version is null then raise sqlstate 'PT422' using message='Review privacy choices and notice version'; end if;
 insert into private.privacy_choices(user_id,research,marketing,notice_version,updated_at)
 values(actor,research_choice,marketing_choice,version,clock_timestamp())
 on conflict(user_id) do update set research=excluded.research,marketing=excluded.marketing,notice_version=excluded.notice_version,updated_at=excluded.updated_at;
 insert into private.privacy_choice_history(user_id,research,marketing,notice_version) values(actor,research_choice,marketing_choice,version);
 return jsonb_build_object('research',research_choice,'marketing',marketing_choice,'noticeVersion',version);
end $$;
revoke all on function private.save_privacy_choices(boolean,boolean,text) from public,anon;
grant execute on function private.save_privacy_choices(boolean,boolean,text) to authenticated;
create function public.save_privacy_choices(research boolean,marketing boolean,notice_version text) returns jsonb
language sql security invoker set search_path=''
as $$ select private.save_privacy_choices(research,marketing,notice_version) $$;
revoke all on function public.save_privacy_choices(boolean,boolean,text) from public,anon;
grant execute on function public.save_privacy_choices(boolean,boolean,text) to authenticated;
