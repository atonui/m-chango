begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$
declare f jsonb; pid text; r jsonb; replay jsonb;
begin
 f:=public.create_fundraiser('{"title":"Synthetic import","paymentNumber":"0700000000"}');
 pid:=f->>'publicId';
 r:=public.commit_contributions(pid,1,'retry-test','[{"displayName":"A","amountMinor":12500,"source":"manual","hideName":true,"transactionReference":"REF1"}]');
 replay:=public.commit_contributions(pid,1,'retry-test','[{"displayName":"A","amountMinor":12500,"source":"manual","hideName":true,"transactionReference":"REF1"}]');
 if r<>replay then raise exception 'FAIL: replay differs'; end if;
 if (select total_minor from public.fundraisers where public_id=pid)<>12500 then raise exception 'FAIL: incorrect total'; end if;
 if (select count(*) from public.history where action='add')<>1 then raise exception 'FAIL: duplicate history'; end if;
 begin
  perform public.commit_contributions(pid,2,'retry-test','[{"displayName":"A","amountMinor":200,"source":"manual"}]');
  raise exception 'FAIL: changed retry accepted';
 exception when sqlstate 'PT409' then null; end;
 begin
  perform public.commit_contributions(pid,1,'stale','[{"displayName":"A","amountMinor":200,"source":"manual"}]');
  raise exception 'FAIL: stale version accepted';
 exception when sqlstate 'PT409' then null; end;
 begin
  perform public.commit_contributions(pid,2,'rollback','[{"displayName":"B","amountMinor":100,"source":"manual"},{"displayName":"C","amountMinor":200,"source":"manual","transactionReference":"REF1"}]');
  raise exception 'FAIL: duplicate reference accepted';
 exception when unique_violation then null; end;
 if (select count(*) from public.contributions)<>1 then raise exception 'FAIL: partial import survived'; end if;
 if (select record_version from public.fundraisers where public_id=pid)<>2 then raise exception 'FAIL: rollback advanced version'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.commit_contributions(pid,2,'retry-test','[{"displayName":"A","amountMinor":12500,"source":"manual","hideName":true,"transactionReference":"REF1"}]');
  raise exception 'FAIL: foreign actor authorized';
 exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
rollback;
