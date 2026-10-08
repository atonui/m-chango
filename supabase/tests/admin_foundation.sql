begin;
insert into auth.users(id) values
 ('40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) values
 ('40000000-0000-4000-8000-000000000101','40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000102','40000000-0000-4000-8000-000000000002');
insert into public.profiles(id,auth_subject) values
 ('41000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
 ('41000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002');

do $$ begin
 if has_table_privilege('anon','private.admin_users','SELECT') then raise exception 'FAIL: anon can read admins'; end if;
 if has_table_privilege('authenticated','private.admin_users','SELECT') then raise exception 'FAIL: authenticated can read admins'; end if;
 if has_table_privilege('authenticated','private.admin_audit_events','SELECT') then raise exception 'FAIL: authenticated can read admin audit'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","session_id":"40000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.admin_overview();
  raise exception 'FAIL: non-admin overview';
 exception when sqlstate 'PT403' then null; end;
end $$;
reset role;

insert into private.admin_users(user_id,role,disabled_at)
values('41000000-0000-4000-8000-000000000001','owner',clock_timestamp());
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","session_id":"40000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.admin_overview();
  raise exception 'FAIL: disabled admin overview';
 exception when sqlstate 'PT403' then null; end;
end $$;
reset role;

update private.admin_users set disabled_at=null where user_id='41000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","session_id":"40000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ declare result jsonb; begin
 result:=public.admin_overview();
 if result->>'role'<>'owner' then raise exception 'FAIL: owner overview role'; end if;
 if result->'environment' is null then raise exception 'FAIL: overview missing environment object'; end if;
 perform private.record_admin_audit('admin_test','fixture','ok','{"section":"overview"}');
 begin
  perform private.record_admin_audit('admin_test','fixture','bad','{"phone":"0700000000"}');
  raise exception 'FAIL: phone audit metadata accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform private.record_admin_audit('admin_test','fixture','bad','{"transactionReference":"ABC"}');
  raise exception 'FAIL: transaction audit metadata accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform private.record_admin_audit('admin_test','fixture','bad','{"rawText":"name 100"}');
  raise exception 'FAIL: raw audit metadata accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform private.record_admin_audit('admin_test','fixture','bad','{"token":"secret"}');
  raise exception 'FAIL: token audit metadata accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform private.record_admin_audit('admin_test','fixture','bad','{"cookie":"session"}');
  raise exception 'FAIL: cookie audit metadata accepted';
 exception when sqlstate 'PT422' then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.admin_audit_events where actor_user_id='41000000-0000-4000-8000-000000000001')<2 then raise exception 'FAIL: audit not recorded'; end if;
end $$;
rollback;
