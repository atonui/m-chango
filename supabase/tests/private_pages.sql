begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; page jsonb; next_page jsonb; begin
 pid:=public.create_fundraiser('{"title":"Private paging","paymentNumber":"0700000000"}')->>'publicId';
 perform public.commit_contributions(pid,1,'seed','[{"displayName":"A","amountMinor":100,"source":"manual","transactionReference":"PRIVATE"},{"displayName":"B","amountMinor":200,"source":"manual"}]');
 page:=public.private_ledger_page(pid,null,1);
 if jsonb_array_length(page->'entries')<>1 then raise exception 'FAIL: page size'; end if;
 if (page->>'totalMinor')::bigint<>300 then raise exception 'FAIL: summary total'; end if;
 next_page:=public.private_ledger_page(pid,page->'nextCursor',1);
 if page->'entries'->0->>'id'=next_page->'entries'->0->>'id' then raise exception 'FAIL: repeated entry'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.private_ledger_page(pid,null,50);
  raise exception 'FAIL: foreign private read';
 exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
rollback;
