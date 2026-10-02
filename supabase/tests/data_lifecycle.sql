begin;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','10000000-0000-4000-8000-000000000001','session_id','10000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Delete fixture","paymentNumber":"0700000000"}');
do $$ declare pid text; begin
 select f.public_id into pid from public.fundraisers f where f.title='Delete fixture';
 perform public.commit_contributions(pid,1,'delete-seed','[{"displayName":"Synthetic","amountMinor":100,"source":"manual"}]');
 perform public.save_privacy_choices(false,false,'2026-10-01');
end $$;
select public.request_account_deletion();
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','10000000-0000-4000-8000-000000000002','session_id','10000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Keep fixture","paymentNumber":"0700000000"}');
reset role;
create temp table deleted_ids as select p.id as actor,f.id as fundraiser from public.profiles p join public.fundraiser_members m on m.user_id=p.id join public.fundraisers f on f.id=m.fundraiser_id where p.auth_subject='10000000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id) values('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
insert into auth.refresh_tokens(token,user_id,session_id) values('synthetic-lifecycle-token','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003');
insert into private.fundraiser_surveys(fundraiser_id,actor_user_id,outcome,feedback) select fundraiser,actor,'achieved','Synthetic' from deleted_ids;
insert into private.product_events(id,event_name,actor_user_id,fundraiser_id) select gen_random_uuid(),'fundraiser_created',actor,fundraiser from deleted_ids;
do $$ begin
 if private.process_account_deletions(10)<>1 then raise exception 'FAIL: processing count'; end if;
 if exists(select 1 from auth.users where id='10000000-0000-4000-8000-000000000001') then raise exception 'FAIL: auth retained'; end if;
 if exists(select 1 from public.fundraisers where title='Delete fixture') then raise exception 'FAIL: ledger retained'; end if;
 if not exists(select 1 from public.fundraisers where title='Keep fixture') then raise exception 'FAIL: foreign ledger deleted'; end if;
 if exists(select 1 from auth.sessions where user_id='10000000-0000-4000-8000-000000000001') or exists(select 1 from auth.refresh_tokens where token='synthetic-lifecycle-token') then raise exception 'FAIL: auth sessions retained'; end if;
 if exists(select 1 from private.privacy_choices where user_id in(select actor from deleted_ids)) or exists(select 1 from private.privacy_choice_history where user_id in(select actor from deleted_ids)) or exists(select 1 from private.fundraiser_surveys where actor_user_id in(select actor from deleted_ids)) or exists(select 1 from private.product_events where actor_user_id in(select actor from deleted_ids)) or exists(select 1 from public.contributions where fundraiser_id in(select fundraiser from deleted_ids)) or exists(select 1 from public.operations where actor_user_id in(select actor from deleted_ids)) or exists(select 1 from public.history where actor_user_id in(select actor from deleted_ids)) then raise exception 'FAIL: linked data retained'; end if;
 if private.process_account_deletions(10)<>0 then raise exception 'FAIL: non-idempotent worker'; end if;
 if has_function_privilege('authenticated','private.process_account_deletions(integer)','EXECUTE') then raise exception 'FAIL: browser worker'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','10000000-0000-4000-8000-000000000001','session_id','10000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ begin
 begin
 perform public.create_fundraiser('{"title":"Deleted token","paymentNumber":"0700000000"}');
 raise exception 'FAIL: deleted identity recreated';
 exception when sqlstate 'PT401' then null; end;
end $$;
rollback;
