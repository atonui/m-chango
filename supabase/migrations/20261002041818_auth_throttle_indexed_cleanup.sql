create or replace function private.expire_auth_attempt_windows() returns integer
language plpgsql security invoker set search_path=''
as $$ declare removed integer; cutoff timestamptz:=clock_timestamp(); begin
 with expired as(select key_hash from private.auth_attempt_windows where expires_at<=cutoff
  order by expires_at limit 10000 for update skip locked)
 delete from private.auth_attempt_windows w using expired e where w.key_hash=e.key_hash;
 get diagnostics removed=row_count;
 return removed;
end $$;
revoke all on function private.expire_auth_attempt_windows() from public,anon,authenticated;
