create function public.private_ledger_page(public_id text,page_cursor jsonb default null,page_size integer default 50) returns jsonb
language plpgsql stable security invoker set search_path=''
as $$ declare f public.fundraisers; entries jsonb; n integer; cursor_result jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 if page_size is null or page_size not between 1 and 100 then raise sqlstate 'PT422' using message='Choose a page size from 1 to 100'; end if;
 if page_cursor is not null and (jsonb_typeof(page_cursor)<>'object' or page_cursor->>'recordedAt' is null or page_cursor->>'id' is null) then raise sqlstate 'PT422' using message='Invalid page cursor'; end if;
 select * into f from public.fundraisers x where x.public_id=private_ledger_page.public_id and private.owns_fundraiser(x.id);
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 with bounded as (
  select c.* from public.contributions c where c.fundraiser_id=f.id
  and (page_cursor is null or (c.recorded_at,c.id)<((page_cursor->>'recordedAt')::timestamptz,(page_cursor->>'id')::uuid))
  order by c.recorded_at desc,c.id desc limit page_size+1
 ), numbered as(select *,row_number() over(order by recorded_at desc,id desc) rn from bounded)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'fundraiserId',fundraiser_id,'displayName',display_name,'amountMinor',amount_minor,
 'transactionReference',transaction_reference,'privatePhone',private_phone,'receivedAt',received_at,'source',source,'hideName',hide_name,
 'removedAt',removed_at,'recordVersion',record_version,'recordedAt',recorded_at,'updatedAt',updated_at)
 order by recorded_at desc,id desc) filter(where rn<=page_size),'[]'),count(*) into entries,n from numbered;
 if n>page_size then cursor_result:=jsonb_build_object('recordedAt',entries->(page_size-1)->>'recordedAt','id',entries->(page_size-1)->>'id'); end if;
 return jsonb_build_object('fundraiser',jsonb_build_object('id',f.id,'publicId',f.public_id,'title',f.title,'purpose',f.purpose,
 'paymentNumber',f.payment_number,'targetMinor',f.target_minor,'publicNamesEnabled',f.public_names_enabled,'status',f.status,
 'recordVersion',f.record_version,'createdAt',f.created_at,'updatedAt',f.updated_at),'entries',entries,
 'totalMinor',f.total_minor,'entryCount',f.entry_count,'nextCursor',cursor_result);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 raise sqlstate 'PT422' using message='Invalid page cursor';
end $$;
revoke all on function public.private_ledger_page(text,jsonb,integer) from public,anon;
grant execute on function public.private_ledger_page(text,jsonb,integer) to authenticated;
