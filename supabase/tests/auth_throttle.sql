begin;
delete from private.auth_throttle_config;
delete from private.auth_attempt_windows;
do $$ begin
 begin perform public.check_auth_rate_limit(repeat('a',64),repeat('b',64));raise exception 'Unconfigured throttle allowed';exception when sqlstate 'PT503' then null;end;
end $$;
insert into private.auth_throttle_config(secret_hash) values(encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'));
set local role anon;
do $$ declare i integer; allowed boolean; begin
 begin perform public.check_auth_rate_limit(repeat('c',64),repeat('b',64));raise exception 'Bad credential allowed';exception when sqlstate 'PT401' then null;end;
 begin perform public.check_auth_rate_limit(null,repeat('b',64));raise exception 'Null credential allowed';exception when sqlstate 'PT401' then null;end;
 begin perform public.check_auth_rate_limit(repeat('a',64),'bad');raise exception 'Bad key allowed';exception when sqlstate 'PT422' then null;end;
 begin perform secret_hash from private.auth_throttle_config;raise exception 'Secret config readable';exception when insufficient_privilege then null;end;
 begin perform key_hash from private.auth_attempt_windows;raise exception 'Counters readable';exception when insufficient_privilege then null;end;
 for i in 1..20 loop
  allowed:=public.check_auth_rate_limit(repeat('a',64),repeat('b',64));
  if allowed is distinct from true then raise exception 'Valid request denied at %',i;end if;
 end loop;
 for i in 1..30 loop
  allowed:=public.check_auth_rate_limit(repeat('a',64),repeat('b',64));
  if allowed is distinct from false then raise exception 'Exceeded rate allowed';end if;
 end loop;
 if not public.check_auth_rate_limit(repeat('a',64),repeat('d',64)) then raise exception 'Independent key denied';end if;
end $$;
reset role;
do $$ begin
 if(select count(*) from private.auth_attempt_windows)<>2 then raise exception 'Rejected requests wrote counters';end if;
 if(select attempts from private.auth_attempt_windows where key_hash=repeat('b',64))<>21 then raise exception 'Counter did not saturate';end if;
end $$;
update private.auth_attempt_windows set expires_at=clock_timestamp()-interval '1 second' where key_hash=repeat('b',64);
set local role anon;
do $$ begin
 if not public.check_auth_rate_limit(repeat('a',64),repeat('b',64)) then raise exception 'Expired window did not reset';end if;
 begin perform private.expire_auth_attempt_windows();raise exception 'Anonymous cleanup allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
update private.auth_attempt_windows set expires_at=clock_timestamp()-interval '1 second' where key_hash=repeat('b',64);
do $$ begin
 if private.expire_auth_attempt_windows()<>1 then raise exception 'Expired cleanup mismatch';end if;
 if not exists(select 1 from private.auth_attempt_windows where key_hash=repeat('d',64)) then raise exception 'Live counter removed';end if;
end $$;
-- A cleanup run deletes at most 10,000 expired counters and preserves live ones.
insert into private.auth_attempt_windows(key_hash,attempts,expires_at)
select repeat(md5('cleanup-fixture-'||n::text),2),1,clock_timestamp()-interval '1 second'
from generate_series(1,10001) n;
do $$ begin
 if private.expire_auth_attempt_windows()<>10000 then raise exception 'Cleanup batch bound mismatch';end if;
 if(select count(*) from private.auth_attempt_windows)<>2 then raise exception 'Cleanup remainder mismatch';end if;
 if private.expire_auth_attempt_windows()<>1 then raise exception 'Cleanup remainder not removed';end if;
 if not exists(select 1 from private.auth_attempt_windows where key_hash=repeat('d',64)) then raise exception 'Live counter removed by batch';end if;
end $$;
rollback;
