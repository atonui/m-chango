begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Synthetic fundraiser","paymentNumber":"0700000000","purpose":"","targetMinor":10000,"publicNamesEnabled":false}'::jsonb);
do $$ begin
 if (select count(*) from public.fundraisers)<>1 then raise exception 'FAIL: missing fundraiser'; end if;
 if (select count(*) from public.fundraiser_members)<>1 then raise exception 'FAIL: missing owner'; end if;
 if (select count(*) from public.history where action='create')<>1 then raise exception 'FAIL: missing audit'; end if;
 begin
  perform public.create_fundraiser('{"title":"Invalid","paymentNumber":"0700000000","targetMinor":-1}'::jsonb);
  raise exception 'FAIL: invalid target accepted';
 exception when check_violation then null; end;
 if (select count(*) from public.fundraisers)<>1 then raise exception 'FAIL: failed create left a row'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform public.create_fundraiser('{"title":"Denied","paymentNumber":"0700000000"}'::jsonb);
  raise exception 'FAIL: anonymous creation permitted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
