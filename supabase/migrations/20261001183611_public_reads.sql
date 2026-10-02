-- Anonymous APIs expose explicit projections only. No private table grants.
create function private.public_summary(pid text) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare r jsonb; begin
 select jsonb_build_object('publicId',f.public_id,'title',f.title,'purpose',f.purpose,
 'paymentNumber',f.payment_number,'status',f.status,'targetMinor',f.target_minor,
 'totalMinor',f.total_minor,'entryCount',f.entry_count,'recordVersion',f.record_version,'updatedAt',f.updated_at)
 into r from public.fundraisers f where f.public_id=pid;
 if r is null then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 return r;
end $$;
revoke all on function private.public_summary(text) from public;
grant usage on schema private to anon;
grant execute on function private.public_summary(text) to anon,authenticated;
create function public.public_summary(public_id text) returns jsonb
language sql stable security invoker set search_path=''
as $$ select private.public_summary(public_id) $$;
revoke all on function public.public_summary(text) from public;
grant execute on function public.public_summary(text) to anon,authenticated;

create function private.public_entries(pid text,page_cursor jsonb,page_size integer) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare fid uuid; names boolean; entries jsonb; next_cursor jsonb; count_rows integer; begin
 if page_size is null or page_size not between 1 and 100 then raise sqlstate 'PT422' using message='Choose a page size from 1 to 100'; end if;
 if page_cursor is not null and (jsonb_typeof(page_cursor)<>'object' or not(page_cursor ? 'recordedAt') or not(page_cursor ? 'id')
  or page_cursor->>'recordedAt' is null or page_cursor->>'id' is null) then
  raise sqlstate 'PT422' using message='Invalid page cursor'; end if;
 select id,public_names_enabled into fid,names from public.fundraisers where public_id=pid;
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 with bounded as (
  select c.id,c.display_name,c.hide_name,c.amount_minor,c.received_at,c.recorded_at
  from public.contributions c where c.fundraiser_id=fid and c.removed_at is null
   and (page_cursor is null or (c.recorded_at,c.id)<((page_cursor->>'recordedAt')::timestamptz,(page_cursor->>'id')::uuid))
  order by c.recorded_at desc,c.id desc limit page_size+1
 ), numbered as (select *,row_number() over(order by recorded_at desc,id desc) as rn from bounded)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'displayName',case when names and not hide_name then display_name else 'Anonymous' end,
  'amountMinor',amount_minor,'receivedAt',received_at,'recordedAt',recorded_at) order by recorded_at desc,id desc) filter(where rn<=page_size),'[]'),
  count(*) into entries,count_rows from numbered;
 if count_rows>page_size then next_cursor:=jsonb_build_object('recordedAt',entries->(page_size-1)->>'recordedAt','id',entries->(page_size-1)->>'id'); end if;
 return jsonb_build_object('entries',entries,'nextCursor',next_cursor);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 raise sqlstate 'PT422' using message='Invalid page cursor';
end $$;
revoke all on function private.public_entries(text,jsonb,integer) from public;
grant execute on function private.public_entries(text,jsonb,integer) to anon,authenticated;
create function public.public_entries(public_id text,page_cursor jsonb default null,page_size integer default 50) returns jsonb
language sql stable security invoker set search_path=''
as $$ select private.public_entries(public_id,page_cursor,page_size) $$;
revoke all on function public.public_entries(text,jsonb,integer) from public;
grant execute on function public.public_entries(text,jsonb,integer) to anon,authenticated;
