begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Account controls","paymentNumber":"0700000000"}');
do $$ declare result jsonb; begin
 result:=public.get_privacy_choices();
 if result->>'research'<>'false' or result->>'marketing'<>'false' then raise exception 'FAIL: opt-in defaults'; end if;
 result:=public.export_account_data();
 if jsonb_array_length(result->'fundraisers')<>1 then raise exception 'FAIL: missing owned fundraiser'; end if;
 begin
  perform public.save_privacy_choices(true,false,'2026-10-01');
  raise exception 'FAIL: opt-in bypassed notice gate';
 exception when sqlstate 'PT422' then null; end;
 perform public.save_privacy_choices(false,false,'2026-10-01');
 perform public.request_account_deletion();
 perform public.request_account_deletion();
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.export_account_data();
  raise exception 'FAIL: no-profile export';
 exception when sqlstate 'PT401' then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.account_deletion_requests)<>1 then raise exception 'FAIL: duplicate deletion request'; end if;
end $$;
delete from private.privacy_notice_configuration;
update private.account_deletion_requests set status='processing';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ begin
 begin
 perform public.save_privacy_choices(true,false,'2026-10-01');
 raise exception 'FAIL: absent configuration permits opt-in';
 exception when sqlstate 'PT422' then null; end;
 if public.request_account_deletion()->>'status'<>'processing' then raise exception 'FAIL: deletion status'; end if;
end $$;
reset role;
insert into private.privacy_choice_history(user_id,research,marketing,notice_version)
select id,false,false,'2026-10-01' from public.profiles cross join generate_series(1,50001);
set local role authenticated;
do $$ begin
 begin
 perform public.export_account_data();
 raise exception 'FAIL: unbounded privacy export';
 exception when sqlstate 'PT422' then null; end;
end $$;
rollback;
