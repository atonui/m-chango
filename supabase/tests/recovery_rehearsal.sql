-- Logical fundraiser loss/restore drill; synthetic fixture, rolled back.
-- This is not a managed backup/PITR or host-failure rehearsal.
begin;
create temp table recovery_result(report jsonb);
do $$ declare subject uuid:=gen_random_uuid(); pid text; fid uuid; actor uuid; tbl text; before_rows bigint; after_rows bigint; started timestamptz; begin
 insert into auth.users(id) values(subject);
 insert into auth.sessions(id,user_id) values(subject,subject);
 perform set_config('request.jwt.claim.sub',subject::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',subject::text,'session_id',subject::text,'role','authenticated')::text,true);
 pid:=public.create_fundraiser('{"title":"Synthetic recovery","paymentNumber":"0700000000"}')->>'publicId';
 perform public.commit_contributions(pid,1,'recovery-seed','[{"displayName":"Synthetic person","amountMinor":12500,"source":"manual","privatePhone":"0700000000","transactionReference":"TESTREF"}]');
 select id into fid from public.fundraisers where public_id=pid;
 select id into actor from public.profiles where auth_subject=subject;
 insert into private.fundraiser_surveys(fundraiser_id,actor_user_id,outcome,feedback) values(fid,actor,'achieved','Synthetic feedback');
 insert into private.product_events(id,event_name,actor_user_id,fundraiser_id) values(gen_random_uuid(),'fundraiser_created',actor,fid);
 create temp table backup_fundraisers as select * from public.fundraisers where id=fid;
 foreach tbl in array array['fundraiser_members','contributions','operations','history'] loop
  execute format('create temp table backup_%I as select * from public.%I where fundraiser_id=$1',tbl,tbl) using fid;
 end loop;
 create temp table backup_surveys as select * from private.fundraiser_surveys where fundraiser_id=fid;
 create temp table backup_events as select * from private.product_events where fundraiser_id=fid;
 started:=clock_timestamp();
 delete from public.fundraisers where id=fid;
 if exists(select 1 from public.contributions where fundraiser_id=fid) then raise exception 'FAIL: loss simulation'; end if;
 insert into public.fundraisers select * from backup_fundraisers;
 foreach tbl in array array['fundraiser_members','contributions','operations','history'] loop
  execute format('insert into public.%I select * from backup_%I',tbl,tbl);
  execute format('select count(*) from ((select * from public.%I where fundraiser_id=$1 except select * from backup_%I) union all (select * from backup_%I except select * from public.%I where fundraiser_id=$1)) differences',tbl,tbl,tbl,tbl) into after_rows using fid;
  if after_rows<>0 then raise exception 'FAIL: restored % mismatch',tbl; end if;
 end loop;
 insert into private.fundraiser_surveys select * from backup_surveys;
 insert into private.product_events select * from backup_events;
 if (select to_jsonb(f) from public.fundraisers f where id=fid)<>(select to_jsonb(b) from backup_fundraisers b)
 or (select to_jsonb(s) from private.fundraiser_surveys s where fundraiser_id=fid)<>(select to_jsonb(b) from backup_surveys b)
 or (select to_jsonb(e) from private.product_events e where fundraiser_id=fid)<>(select to_jsonb(b) from backup_events b) then raise exception 'FAIL: restored metadata mismatch'; end if;
 if (public.public_summary(pid)->>'totalMinor')::bigint<>12500 then raise exception 'FAIL: restored public total'; end if;
 insert into recovery_result values(jsonb_build_object('kind','transactional logical restore','exactRowEquality',true,'restoreMs',extract(epoch from clock_timestamp()-started)*1000,'restoredTables',7,'synthetic',true));
end $$;
select report from recovery_result;
rollback;
