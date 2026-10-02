begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Owned A","paymentNumber":"0700000000"}');
select public.create_fundraiser('{"title":"Owned B","paymentNumber":"0700000000"}');
do $$ declare p jsonb; q jsonb; begin
 p:=public.list_owned_fundraisers(null,1);
 if jsonb_array_length(p->'fundraisers')<>1 or p->'nextCursor'='null' then raise exception 'FAIL: dashboard pagination'; end if;
 q:=public.list_owned_fundraisers(p->'nextCursor',1);
 if q->'fundraisers'->0->>'id'=p->'fundraisers'->0->>'id' then raise exception 'FAIL: repeated dashboard row'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 if jsonb_array_length(public.list_owned_fundraisers(null,20)->'fundraisers')<>0 then raise exception 'FAIL: foreign dashboard data'; end if;
end $$;
reset role;
rollback;
