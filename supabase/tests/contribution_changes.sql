begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; eid uuid; r jsonb; begin
 pid:=public.create_fundraiser('{"title":"Changes","paymentNumber":"0700000000"}')->>'publicId';
 r:=public.commit_contributions(pid,1,'seed','[{"displayName":"A","amountMinor":100,"source":"manual"}]');
 eid:=(r->'entryIds'->>0)::uuid;
 perform public.edit_contribution(pid,eid,2,'{"displayName":"Corrected","amountMinor":250,"source":"manual"}');
 if (select total_minor from public.fundraisers where public_id=pid)<>250 then raise exception 'FAIL: edit total'; end if;
 perform public.set_contribution_removed(pid,eid,3,true);
 if (select total_minor from public.fundraisers where public_id=pid)<>0 or (select entry_count from public.fundraisers where public_id=pid)<>0 then raise exception 'FAIL: remove counters'; end if;
 perform public.edit_contribution(pid,eid,4,'{"displayName":"Corrected","amountMinor":350,"source":"manual"}');
 if (select total_minor from public.fundraisers where public_id=pid)<>0 then raise exception 'FAIL: removed edit counted'; end if;
 perform public.set_contribution_removed(pid,eid,5,false);
 if (select total_minor from public.fundraisers where public_id=pid)<>350 or (select entry_count from public.fundraisers where public_id=pid)<>1 then raise exception 'FAIL: restore counters'; end if;
 begin
  perform public.edit_contribution(pid,eid,2,'{"displayName":"Stale","amountMinor":1,"source":"manual"}');
  raise exception 'FAIL: stale edit accepted';
 exception when sqlstate 'PT409' then null; end;
 begin
  perform public.set_contribution_removed(pid,gen_random_uuid(),6,true);
  raise exception 'FAIL: missing entry accepted';
 exception when sqlstate 'PT404' then null; end;
 if (select count(*) from public.history where action in ('edit','remove','restore'))<>4 then raise exception 'FAIL: change history'; end if;
 if exists(select 1 from public.history where actor_user_id is null) then raise exception 'FAIL: missing actor'; end if;
end $$;
reset role;
rollback;
