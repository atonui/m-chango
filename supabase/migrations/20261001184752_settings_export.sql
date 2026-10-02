create function private.update_fundraiser(pid text,expected bigint,payload jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare f public.fundraisers; changed public.fundraisers; actor uuid; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select id into actor from public.profiles where auth_subject=auth.uid();
 select x.* into f from public.fundraisers x join public.fundraiser_members m on m.fundraiser_id=x.id
 where x.public_id=pid and m.user_id=actor for update of x;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if expected is null or expected<>f.record_version then raise sqlstate 'PT409' using message='Refresh and review latest changes'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' then raise sqlstate 'PT422' using message='Invalid settings'; end if;
 update public.fundraisers set title=trim(payload->>'title'),purpose=coalesce(payload->>'purpose',''),
 payment_number=payload->>'paymentNumber',target_minor=(payload->>'targetMinor')::bigint,
 public_names_enabled=coalesce((payload->>'publicNamesEnabled')::boolean,false),status=coalesce(payload->>'status','active'),
 category=payload->>'category',county=payload->>'county',record_version=record_version+1,updated_at=clock_timestamp()
 where id=f.id returning * into changed;
 insert into public.history(fundraiser_id,actor_user_id,action,previous_value,new_value)
 values(f.id,actor,'settings',to_jsonb(f),to_jsonb(changed));
 return jsonb_build_object('recordVersion',changed.record_version);
end $$;
revoke all on function private.update_fundraiser(text,bigint,jsonb) from public,anon;
grant execute on function private.update_fundraiser(text,bigint,jsonb) to authenticated;
create function public.update_fundraiser(public_id text,expected_version bigint,payload jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.update_fundraiser(public_id,expected_version,payload) $$;
revoke all on function public.update_fundraiser(text,bigint,jsonb) from public,anon;
grant execute on function public.update_fundraiser(text,bigint,jsonb) to authenticated;

create function private.export_snapshot(pid text) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare f public.fundraisers; entries jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select x.* into f from public.fundraisers x where x.public_id=pid and private.owns_fundraiser(x.id);
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if f.entry_count>5000 then raise sqlstate 'PT422' using message='Full export supports up to 5,000 active entries'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'fundraiserId',c.fundraiser_id,'displayName',c.display_name,
 'amountMinor',c.amount_minor,'transactionReference',c.transaction_reference,'privatePhone',c.private_phone,
 'receivedAt',c.received_at,'source',c.source,'hideName',c.hide_name,'removedAt',c.removed_at,
 'recordVersion',c.record_version,'recordedAt',c.recorded_at,'updatedAt',c.updated_at) order by c.recorded_at desc,c.id desc),'[]')
 into entries from public.contributions c where c.fundraiser_id=f.id and c.removed_at is null;
 return jsonb_build_object('fundraiser',jsonb_build_object('id',f.id,'publicId',f.public_id,'title',f.title,'purpose',f.purpose,
 'paymentNumber',f.payment_number,'targetMinor',f.target_minor,'publicNamesEnabled',f.public_names_enabled,'status',f.status,
 'recordVersion',f.record_version,'createdAt',f.created_at,'updatedAt',f.updated_at),
 'entries',entries,'totalMinor',f.total_minor,'entryCount',f.entry_count);
end $$;
revoke all on function private.export_snapshot(text) from public,anon;
grant execute on function private.export_snapshot(text) to authenticated;
create function public.export_snapshot(public_id text) returns jsonb
language sql stable security invoker set search_path=''
as $$ select private.export_snapshot(public_id) $$;
revoke all on function public.export_snapshot(text) from public,anon;
grant execute on function public.export_snapshot(text) to authenticated;
