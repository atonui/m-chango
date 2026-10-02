begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; snapshot jsonb; begin
 pid:=public.create_fundraiser('{"title":"Export test","paymentNumber":"0700000000"}')->>'publicId';
 perform public.commit_contributions(pid,1,'entries','[{"displayName":"A","amountMinor":100,"source":"manual"}]');
 perform public.update_fundraiser(pid,2,'{"title":"Updated","purpose":"Test","paymentNumber":"0700000000","targetMinor":500,"publicNamesEnabled":false,"status":"closed"}');
 snapshot:=public.export_snapshot(pid);
 if snapshot->'fundraiser'->>'title'<>'Updated' or (snapshot->>'totalMinor')::bigint<>100 then raise exception 'FAIL: snapshot settings/total'; end if;
 if jsonb_array_length(snapshot->'entries')<>1 then raise exception 'FAIL: incomplete snapshot'; end if;
 if (select count(*) from public.history where action='settings')<>1 then raise exception 'FAIL: missing settings audit'; end if;
 begin
  perform public.update_fundraiser(pid,2,'{"title":"Stale","paymentNumber":"0700000000"}');
  raise exception 'FAIL: stale settings accepted';
 exception when sqlstate 'PT409' then null; end;
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.export_snapshot(pid);
  raise exception 'FAIL: foreign export permitted';
 exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
rollback;
