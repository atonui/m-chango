-- Run via a development-project admin connection. All fixtures roll back.
begin;
do $$ begin
 if to_regclass('public.profiles') is null then raise exception 'FAIL: account foundation schema missing'; end if;
end $$;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
insert into public.profiles(id,auth_subject) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');
insert into public.fundraisers(id,title,payment_number) values('20000000-0000-4000-8000-000000000001','Synthetic test','0700000000');
insert into public.fundraiser_members(fundraiser_id,user_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
do $$ begin
 begin
  insert into public.fundraiser_members(fundraiser_id,user_id) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
  raise exception 'FAIL: duplicate owner accepted';
 exception when unique_violation then null; end;
 begin
  insert into public.profiles(auth_subject) values('00000000-0000-4000-8000-000000000001');
  raise exception 'FAIL: duplicate auth mapping accepted';
 exception when unique_violation then null; end;
 begin
  insert into public.contributions(fundraiser_id,display_name,amount_minor,source) values('20000000-0000-4000-8000-000000000001','Test',0,'manual');
  raise exception 'FAIL: zero amount accepted';
 exception when check_violation then null; end;
 begin
  insert into public.fundraiser_members(fundraiser_id,user_id) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001');
  raise exception 'FAIL: invalid fundraiser reference accepted';
 exception when foreign_key_violation then null; end;
end $$;
insert into public.contributions(fundraiser_id,display_name,amount_minor,source,transaction_reference,removed_at)
 values('20000000-0000-4000-8000-000000000001','Test',100,'manual','RESERVED',now());
do $$ begin
 begin
  insert into public.contributions(fundraiser_id,display_name,amount_minor,source,transaction_reference)
   values('20000000-0000-4000-8000-000000000001','Test',100,'manual','RESERVED');
  raise exception 'FAIL: removed reference reused';
 exception when unique_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ begin
 if (select count(*) from public.fundraisers)<>1 then raise exception 'FAIL: owner cannot read'; end if;
 begin
  update public.fundraisers set title='Forbidden';
  raise exception 'FAIL: direct browser mutation permitted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
do $$ begin
 if (select count(*) from public.fundraisers)<>0 then raise exception 'FAIL: foreign owner can read'; end if;
 if (select count(*) from public.contributions)<>0 then raise exception 'FAIL: foreign owner can read entries'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform * from public.fundraisers;
  raise exception 'FAIL: anonymous private-table read allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
