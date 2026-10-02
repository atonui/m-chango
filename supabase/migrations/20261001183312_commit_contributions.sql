create function private.commit_contributions(public_id text,expected_version bigint,operation_key text,rows jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare f public.fundraisers; actor uuid; prior public.operations;
 payload_digest text; r jsonb; row jsonb; eid uuid;
 ids jsonb:='[]'; added bigint:=0; n integer; at_time timestamptz:=clock_timestamp();
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select p.id into actor from public.profiles p where p.auth_subject=auth.uid();
 select x.* into f from public.fundraisers x join public.fundraiser_members m on m.fundraiser_id=x.id
 where x.public_id=commit_contributions.public_id and m.user_id=actor for update of x;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if operation_key is null or length(operation_key) not between 1 and 160 then
  raise sqlstate 'PT422' using message='Invalid retry key'; end if;
 if rows is null or jsonb_typeof(rows)<>'array' then raise sqlstate 'PT422' using message='Expected contribution array'; end if;
 n:=jsonb_array_length(rows);
 if n not between 1 and 500 then raise sqlstate 'PT422' using message='Select 1–500 entries'; end if;
 -- Store canonical JSON as the digest: exact equality, no hash collision risk.
 payload_digest:=rows::text;
 select * into prior from public.operations o where o.fundraiser_id=f.id and o.actor_user_id=actor and o.idempotency_key=operation_key;
 if found then
  if prior.digest<>payload_digest then raise sqlstate 'PT409' using message='Retry key used for different entries'; end if;
  return prior.result;
 end if;
 if expected_version is null or f.record_version<>expected_version then raise sqlstate 'PT409' using message='Refresh and review latest changes'; end if;
 if f.status<>'active' then raise sqlstate 'PT409' using message='Reopen before adding entries'; end if;
 for row in select value from jsonb_array_elements(rows) loop
  if jsonb_typeof(row)<>'object' or jsonb_typeof(row->'amountMinor')<>'number'
   or (row->>'amountMinor')!~'^[0-9]+$' then raise sqlstate 'PT422' using message='Invalid contribution'; end if;
  eid:=gen_random_uuid();
  insert into public.contributions(id,fundraiser_id,display_name,amount_minor,transaction_reference,private_phone,received_at,source,hide_name,recorded_at,updated_at)
  values(eid,f.id,trim(row->>'displayName'),(row->>'amountMinor')::bigint,
   nullif(upper(trim(row->>'transactionReference')),''),nullif(row->>'privatePhone',''),(row->>'receivedAt')::timestamptz,
   row->>'source',coalesce((row->>'hideName')::boolean,true),at_time,at_time);
  insert into public.history(fundraiser_id,contribution_id,actor_user_id,action,new_value,created_at)
  select f.id,eid,actor,'add',to_jsonb(c),at_time from public.contributions c where c.id=eid;
  ids:=ids||jsonb_build_array(eid);
  added:=added+(row->>'amountMinor')::bigint;
 end loop;
 update public.fundraisers set total_minor=total_minor+added,entry_count=entry_count+n,
  record_version=record_version+1,updated_at=at_time where id=f.id;
 r:=jsonb_build_object('entryIds',ids,'recordVersion',f.record_version+1);
 insert into public.operations(fundraiser_id,actor_user_id,idempotency_key,digest,result)
 values(f.id,actor,operation_key,payload_digest,r);
 return r;
end $$;
revoke all on function private.commit_contributions(text,bigint,text,jsonb) from public,anon;
grant execute on function private.commit_contributions(text,bigint,text,jsonb) to authenticated;
create function public.commit_contributions(public_id text,expected_version bigint,operation_key text,rows jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.commit_contributions(public_id,expected_version,operation_key,rows) $$;
revoke all on function public.commit_contributions(text,bigint,text,jsonb) from public,anon;
grant execute on function public.commit_contributions(text,bigint,text,jsonb) to authenticated;
