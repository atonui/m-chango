create function private.change_contribution(pid text,eid uuid,expected bigint,action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare f public.fundraisers; actor uuid; before_row public.contributions; after_row public.contributions;
 old_amount bigint; new_amount bigint; old_count integer; new_count integer; at_time timestamptz:=clock_timestamp();
begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 select x.* into f from public.fundraisers x join public.fundraiser_members m on m.fundraiser_id=x.id
 where x.public_id=pid and m.user_id=actor for update of x;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if expected is null or expected<>f.record_version then raise sqlstate 'PT409' using message='Refresh and review latest changes'; end if;
 select * into before_row from public.contributions where id=eid and fundraiser_id=f.id;
 if not found then raise sqlstate 'PT404' using message='Contribution not found'; end if;
 if action='edit' then
  if payload is null or jsonb_typeof(payload)<>'object' or coalesce(jsonb_typeof(payload->'amountMinor'),'null')<>'number'
   or (payload->>'amountMinor')!~'^[0-9]+$' then raise sqlstate 'PT422' using message='Invalid contribution'; end if;
  update public.contributions set display_name=trim(payload->>'displayName'),amount_minor=(payload->>'amountMinor')::bigint,
   transaction_reference=nullif(upper(trim(payload->>'transactionReference')),''),private_phone=nullif(payload->>'privatePhone',''),
   received_at=(payload->>'receivedAt')::timestamptz,source=payload->>'source',hide_name=coalesce((payload->>'hideName')::boolean,true),
   record_version=record_version+1,updated_at=at_time where id=eid returning * into after_row;
 elsif action in ('remove','restore') then
  if (action='remove')=(before_row.removed_at is not null) then raise sqlstate 'PT409' using message='Contribution already in requested state'; end if;
  update public.contributions set removed_at=case when action='remove' then at_time else null end,
   record_version=record_version+1,updated_at=at_time where id=eid returning * into after_row;
 else raise sqlstate 'PT422' using message='Unsupported change'; end if;
 old_count:=case when before_row.removed_at is null then 1 else 0 end;
 new_count:=case when after_row.removed_at is null then 1 else 0 end;
 old_amount:=old_count*before_row.amount_minor;
 new_amount:=new_count*after_row.amount_minor;
 update public.fundraisers set total_minor=total_minor-old_amount+new_amount,entry_count=entry_count-old_count+new_count,
  record_version=record_version+1,updated_at=at_time where id=f.id;
 insert into public.history(fundraiser_id,contribution_id,actor_user_id,action,previous_value,new_value,created_at)
 values(f.id,eid,actor,action,to_jsonb(before_row),to_jsonb(after_row),at_time);
 return jsonb_build_object('recordVersion',f.record_version+1);
end $$;
revoke all on function private.change_contribution(text,uuid,bigint,text,jsonb) from public,anon;
grant execute on function private.change_contribution(text,uuid,bigint,text,jsonb) to authenticated;
create function public.edit_contribution(public_id text,entry_id uuid,expected_version bigint,payload jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.change_contribution(public_id,entry_id,expected_version,'edit',payload) $$;
revoke all on function public.edit_contribution(text,uuid,bigint,jsonb) from public,anon;
grant execute on function public.edit_contribution(text,uuid,bigint,jsonb) to authenticated;
create function public.set_contribution_removed(public_id text,entry_id uuid,expected_version bigint,removed boolean) returns jsonb
language plpgsql security invoker set search_path=''
as $$ begin
 if removed is null then raise sqlstate 'PT422' using message='Choose remove or restore'; end if;
 return private.change_contribution(public_id,entry_id,expected_version,case when removed then 'remove' else 'restore' end,null);
end $$;
revoke all on function public.set_contribution_removed(text,uuid,bigint,boolean) from public,anon;
grant execute on function public.set_contribution_removed(text,uuid,bigint,boolean) to authenticated;
