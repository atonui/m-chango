begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; rows jsonb; begin
 pid:=public.create_fundraiser('{"title":"Limits","paymentNumber":"0700000000"}')->>'publicId';
 select jsonb_agg(jsonb_build_object('displayName','Synthetic','amountMinor',100,'source','manual')) into rows from generate_series(1,500);
 perform public.commit_contributions(pid,1,'five-hundred',rows);
 if (select total_minor from public.fundraisers where public_id=pid)<>50000 then raise exception 'FAIL: batch total'; end if;
 if (select entry_count from public.fundraisers where public_id=pid)<>500 then raise exception 'FAIL: batch count'; end if;
 if (select count(*) from public.history where action='add')<>500 then raise exception 'FAIL: batch audit'; end if;
 begin
  perform public.commit_contributions(pid,2,'too-many',rows||jsonb_build_array(rows->0));
  raise exception 'FAIL: 501 rows accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform public.commit_contributions(pid,2,'fraction','[{"displayName":"A","amountMinor":1.5,"source":"manual"}]');
  raise exception 'FAIL: fractional minor units accepted';
 exception when sqlstate 'PT422' then null; end;
 begin
  perform public.commit_contributions(pid,2,'over-limit','[{"displayName":"A","amountMinor":10000000001,"source":"manual"}]');
  raise exception 'FAIL: entry maximum exceeded';
 exception when check_violation then null; end;
 if (select record_version from public.fundraisers where public_id=pid)<>2 then raise exception 'FAIL: rejected batch changed version'; end if;
end $$;
reset role;
update public.fundraisers set total_minor=9007199254740991;
set local role authenticated;
do $$ declare pid text; begin
 select public_id into pid from public.fundraisers;
 begin
  perform public.commit_contributions(pid,2,'overflow','[{"displayName":"A","amountMinor":1,"source":"manual"}]');
  raise exception 'FAIL: unsafe aggregate accepted';
 exception when check_violation then null; end;
 if (select count(*) from public.contributions)<>500 then raise exception 'FAIL: overflow left entries'; end if;
end $$;
reset role;
update public.fundraisers set status='closed';
set local role authenticated;
do $$ declare pid text; begin
 select public_id into pid from public.fundraisers;
 begin
  perform public.commit_contributions(pid,2,'closed','[{"displayName":"A","amountMinor":1,"source":"manual"}]');
  raise exception 'FAIL: closed fundraiser accepted entries';
 exception when sqlstate 'PT409' then null; end;
end $$;
reset role;
rollback;
