begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into auth.sessions(id,user_id) select id,id from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
 select set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000001','session_id','00000000-0000-4000-8000-000000000001','role','authenticated')::text,true);
do $$ declare pid text; begin
 pid:=public.create_fundraiser('{"title":"Survey test","paymentNumber":"0700000000"}')->>'publicId';
 begin
  perform public.save_closing_survey(pid,'achieved','Private feedback');
  raise exception 'FAIL: active fundraiser survey accepted';
 exception when sqlstate 'PT409' then null; end;
 perform public.update_fundraiser(pid,1,'{"title":"Survey test","paymentNumber":"0700000000","status":"closed"}');
 perform public.save_closing_survey(pid,'achieved','Private feedback');
 perform public.save_closing_survey(pid,'partly_achieved','Updated feedback');
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-4000-8000-000000000002','session_id','00000000-0000-4000-8000-000000000002','role','authenticated')::text,true);
 begin
  perform public.save_closing_survey(pid,'achieved','Foreign');
  raise exception 'FAIL: foreign survey accepted';
 exception when sqlstate 'PT404' then null; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.fundraiser_surveys)<>1 then raise exception 'FAIL: duplicate survey'; end if;
 if (select outcome from private.fundraiser_surveys)<>'partly_achieved' then raise exception 'FAIL: survey update lost'; end if;
 if has_table_privilege('anon','private.fundraiser_surveys','SELECT') then raise exception 'FAIL: anonymous survey access'; end if;
 if private.expire_survey_feedback(now())<>0 then raise exception 'FAIL: unexpired feedback removed'; end if;
 if private.expire_survey_feedback(now()+interval '181 days')<>1 then raise exception 'FAIL: expired feedback retained'; end if;
 if exists(select 1 from private.fundraiser_surveys where feedback is not null) then raise exception 'FAIL: feedback remains'; end if;
end $$;
rollback;
