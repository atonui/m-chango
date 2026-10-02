create function public.list_owned_fundraisers(page_cursor jsonb default null,page_size integer default 20) returns jsonb
language plpgsql stable security invoker set search_path=''
as $$ declare result jsonb; n integer; cursor_result jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 if page_size is null or page_size not between 1 and 50 then raise sqlstate 'PT422' using message='Choose a page size from 1 to 50'; end if;
 if page_cursor is not null and (jsonb_typeof(page_cursor)<>'object' or page_cursor->>'updatedAt' is null or page_cursor->>'id' is null) then
  raise sqlstate 'PT422' using message='Invalid page cursor'; end if;
 with bounded as (
  select f.* from public.fundraisers f
  where page_cursor is null or (f.updated_at,f.id)<((page_cursor->>'updatedAt')::timestamptz,(page_cursor->>'id')::uuid)
  order by f.updated_at desc,f.id desc limit page_size+1
 ), numbered as (select *,row_number() over(order by updated_at desc,id desc) rn from bounded)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'publicId',public_id,'title',title,'status',status,'totalMinor',total_minor,
 'targetMinor',target_minor,'updatedAt',updated_at) order by updated_at desc,id desc) filter(where rn<=page_size),'[]'),count(*)
 into result,n from numbered;
 if n>page_size then cursor_result:=jsonb_build_object('updatedAt',result->(page_size-1)->>'updatedAt','id',result->(page_size-1)->>'id'); end if;
 return jsonb_build_object('fundraisers',result,'nextCursor',cursor_result);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 raise sqlstate 'PT422' using message='Invalid page cursor';
end $$;
revoke all on function public.list_owned_fundraisers(jsonb,integer) from public,anon;
grant execute on function public.list_owned_fundraisers(jsonb,integer) to authenticated;
