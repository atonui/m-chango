begin;
insert into auth.users(id) values('30000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) values('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"30000000-0000-4000-8000-000000000001","session_id":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if not public.organizer_session_valid() then raise exception 'FAIL: live session denied'; end if;
 perform public.ensure_organizer_profile();
 perform public.ensure_organizer_profile();
 if (select count(*) from public.profiles)<>1 then raise exception 'FAIL: duplicate sign-in profile'; end if;
 perform public.export_account_data();
 perform public.create_fundraiser('{"title":"Session fixture","paymentNumber":"0700000000"}');
end $$;
reset role;
delete from auth.sessions where id='30000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
 if public.organizer_session_valid() then raise exception 'FAIL: revoked session accepted'; end if;
 begin perform public.export_account_data();raise exception 'FAIL: revoked export';exception when sqlstate 'PT401' then null;end;
 begin perform public.create_fundraiser('{"title":"Revoked create","paymentNumber":"0700000000"}');raise exception 'FAIL: revoked create';exception when sqlstate 'PT401' then null;end;
 if exists(select 1 from public.profiles) then raise exception 'FAIL: direct RLS bypass'; end if;
end $$;
rollback;
