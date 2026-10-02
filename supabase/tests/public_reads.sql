begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Public test","paymentNumber":"0700000000","publicNamesEnabled":true}');
do $$ declare pid text; begin
 select public_id into pid from public.fundraisers;
 perform public.commit_contributions(pid,1,'entries','[{"displayName":"Visible","amountMinor":100,"source":"manual","hideName":false,"privatePhone":"PRIVATE","transactionReference":"SECRET"},{"displayName":"Hidden","amountMinor":200,"source":"manual","hideName":true}]');
end $$;
reset role;
select set_config('test.public_id',(select public_id from public.fundraisers),true);
set local role anon;
do $$ declare summary jsonb; page jsonb; next_page jsonb; pid text:=current_setting('test.public_id'); begin
 summary:=public.public_summary(pid);
 if (summary->>'totalMinor')::bigint<>300 then raise exception 'FAIL: public total'; end if;
 if summary ? 'ownerId' or summary ? 'credentialHash' then raise exception 'FAIL: public private fields'; end if;
 page:=public.public_entries(pid,null,1);
 if jsonb_array_length(page->'entries')<>1 then raise exception 'FAIL: page size'; end if;
 next_page:=public.public_entries(pid,page->'nextCursor',1);
 if page->'entries'->0->>'id'=next_page->'entries'->0->>'id' then raise exception 'FAIL: repeated page'; end if;
 if page::text like '%SECRET%' or page::text like '%PRIVATE%' then raise exception 'FAIL: private contribution data'; end if;
 if (page::text||next_page::text) like '%Hidden%' then raise exception 'FAIL: hidden name'; end if;
 begin
  perform public.public_entries(pid,null,101);
  raise exception 'FAIL: unbounded page';
 exception when sqlstate 'PT422' then null; end;
end $$;
reset role;
update public.fundraisers set public_names_enabled=false;
set local role anon;
do $$ begin
 if public.public_entries(current_setting('test.public_id'),null,100)::text like '%Visible%' then raise exception 'FAIL: global privacy stale'; end if;
end $$;
reset role;
rollback;
