begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; result jsonb; begin
 pid:=public.create_fundraiser('{"title":"Preview","paymentNumber":"0700000000"}')->>'publicId';
 perform public.commit_contributions(pid,1,'seed','[{"displayName":" Alice  Doe ","amountMinor":100,"source":"manual","transactionReference":"RESERVED"}]');
 result:=public.check_import_duplicates(pid,'[{"id":"test","displayName":"alice doe","amountMinor":100,"transactionReference":"RESERVED"}]');
 if result->'rows'->0->>'referenceExists'<>'true' or result->'rows'->0->>'possibleDuplicate'<>'true' then raise exception 'FAIL: duplicate flags'; end if;
 if result::text like '%privatePhone%' then raise exception 'FAIL: preview data leakage'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.check_import_duplicates(pid,'[]');
  raise exception 'FAIL: foreign preview allowed';
 exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
rollback;
