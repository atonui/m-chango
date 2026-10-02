create table private.auth_throttle_config (singleton boolean primary key default true check(singleton),secret_hash text not null check(secret_hash ~ '^[0-9a-f]{64}$'));
create table private.auth_attempt_windows (key_hash text primary key check(key_hash ~ '^[0-9a-f]{64}$'),attempts integer not null check(attempts between 1 and 21),expires_at timestamptz not null);
create index auth_attempt_windows_expiry_idx on private.auth_attempt_windows(expires_at);
alter table private.auth_throttle_config enable row level security;
alter table private.auth_attempt_windows enable row level security;
revoke all on private.auth_throttle_config,private.auth_attempt_windows from public,anon,authenticated;
create function private.check_auth_rate_limit(server_token text,key_hash text) returns boolean language plpgsql security definer set search_path='' as $$ declare expected text; count_attempts integer; instant timestamptz:=clock_timestamp(); begin
select secret_hash into expected from private.auth_throttle_config where singleton;
if expected is null then raise sqlstate 'PT503' using message='Throttle is not configured'; end if;
if server_token is null or server_token !~ '^[0-9a-f]{64}$' or encode(sha256(convert_to(server_token,'UTF8')),'hex')<>expected then raise sqlstate 'PT401' using message='Invalid throttle credential';end if;
if key_hash is null or key_hash !~ '^[0-9a-f]{64}$' then raise sqlstate 'PT422' using message='Invalid throttle key'; end if;
insert into private.auth_attempt_windows as w(key_hash,attempts,expires_at) values(key_hash,1,instant+interval '60 seconds') on conflict on constraint auth_attempt_windows_pkey do update set attempts=case when w.expires_at<=instant then 1 else least(w.attempts+1,21) end,expires_at=case when w.expires_at<=instant then instant+interval '60 seconds' else w.expires_at end returning attempts into count_attempts;
return count_attempts<=20;end $$;
revoke all on function private.check_auth_rate_limit(text,text) from public;
grant execute on function private.check_auth_rate_limit(text,text) to anon,authenticated;
create function public.check_auth_rate_limit(server_token text,key_hash text) returns boolean language sql security invoker set search_path='' as $$ select private.check_auth_rate_limit(server_token,key_hash) $$;
revoke all on function public.check_auth_rate_limit(text,text) from public;
grant execute on function public.check_auth_rate_limit(text,text) to anon,authenticated;
create function private.expire_auth_attempt_windows() returns integer language plpgsql security invoker set search_path='' as $$ declare removed integer; begin
with expired as(select key_hash from private.auth_attempt_windows where expires_at<=clock_timestamp() order by expires_at limit 10000 for update skip locked) delete from private.auth_attempt_windows w using expired e where w.key_hash=e.key_hash;
get diagnostics removed=row_count;return removed;end $$;
revoke all on function private.expire_auth_attempt_windows() from public,anon,authenticated;
select cron.schedule('m-chango-auth-throttle-retention','* * * * *','select private.expire_auth_attempt_windows()');
