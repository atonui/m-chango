begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001');
update private.privacy_notice_configuration set ready=true;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
select public.create_fundraiser('{"title":"Choices test","paymentNumber":"0700000000"}');
select public.save_privacy_choices(true,false,'2026-10-01');
select public.save_privacy_choices(false,true,'2026-10-01');
reset role;
do $$ begin
 if (select count(*) from private.privacy_choices)<>1 then raise exception 'FAIL: duplicated choices'; end if;
 if (select research from private.privacy_choices) then raise exception 'FAIL: withdrawal ignored'; end if;
 if not(select marketing from private.privacy_choices) then raise exception 'FAIL: separate marketing choice lost'; end if;
 if (select count(*) from private.privacy_choice_history)<>2 then raise exception 'FAIL: missing choice history'; end if;
 if has_table_privilege('anon','private.privacy_choices','SELECT') then raise exception 'FAIL: public choices'; end if;
end $$;
rollback;
