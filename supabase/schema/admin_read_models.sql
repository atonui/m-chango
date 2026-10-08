create function private.admin_fundraisers(page_cursor jsonb default null,page_size integer default 25,search text default null) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare items jsonb; n integer; cursor_result jsonb; normalized text; begin
 perform private.require_admin();
 if page_size is null or page_size not between 1 and 50 then raise sqlstate 'PT422' using message='Choose a page size from 1 to 50'; end if;
 if page_cursor is not null and (jsonb_typeof(page_cursor)<>'object' or page_cursor->>'updatedAt' is null or page_cursor->>'id' is null) then raise sqlstate 'PT422' using message='Invalid page cursor'; end if;
 normalized:=nullif(trim(coalesce(search,'')),'');
 with bounded as (
  select f.id,f.public_id,f.title,f.status,f.total_minor,f.entry_count,f.category,f.county,f.created_at,f.updated_at,p.display_name owner_name
  from public.fundraisers f
  left join public.fundraiser_members m on m.fundraiser_id=f.id
  left join public.profiles p on p.id=m.user_id
  where (normalized is null or f.title ilike '%'||normalized||'%' or f.public_id ilike '%'||normalized||'%')
  and (page_cursor is null or (f.updated_at,f.id)<((page_cursor->>'updatedAt')::timestamptz,(page_cursor->>'id')::uuid))
  order by f.updated_at desc,f.id desc limit page_size+1
 ), numbered as(select *,row_number() over(order by updated_at desc,id desc) rn from bounded)
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'publicId',public_id,'title',title,'status',status,'totalMinor',total_minor,'entryCount',entry_count,
  'category',category,'county',county,'ownerDisplayName',owner_name,'createdAt',created_at,'updatedAt',updated_at
 ) order by updated_at desc,id desc) filter(where rn<=page_size),'[]'),count(*) into items,n from numbered;
 if n>page_size then cursor_result:=jsonb_build_object('updatedAt',items->(page_size-1)->>'updatedAt','id',items->(page_size-1)->>'id'); end if;
 perform private.record_admin_audit('admin.fundraisers.list','admin','fundraisers',jsonb_build_object('pageSize',page_size,'hasSearch',normalized is not null));
 return jsonb_build_object('fundraisers',items,'nextCursor',cursor_result);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 raise sqlstate 'PT422' using message='Invalid page cursor';
end $$;
revoke all on function private.admin_fundraisers(jsonb,integer,text) from public,anon;
grant execute on function private.admin_fundraisers(jsonb,integer,text) to authenticated;

create function public.admin_fundraisers(page_cursor jsonb default null,page_size integer default 25,search text default null) returns jsonb
language sql security invoker set search_path=''
as $$ select private.admin_fundraisers(page_cursor,page_size,search) $$;
revoke all on function public.admin_fundraisers(jsonb,integer,text) from public,anon;
grant execute on function public.admin_fundraisers(jsonb,integer,text) to authenticated;

create function private.admin_users(page_cursor jsonb default null,page_size integer default 25,search text default null) returns jsonb
language plpgsql stable security definer set search_path=''
as $$ declare items jsonb; n integer; cursor_result jsonb; normalized text; begin
 perform private.require_admin();
 if page_size is null or page_size not between 1 and 50 then raise sqlstate 'PT422' using message='Choose a page size from 1 to 50'; end if;
 if page_cursor is not null and (jsonb_typeof(page_cursor)<>'object' or page_cursor->>'createdAt' is null or page_cursor->>'id' is null) then raise sqlstate 'PT422' using message='Invalid page cursor'; end if;
 normalized:=nullif(trim(coalesce(search,'')),'');
 with user_totals as (
  select p.id,p.display_name,p.created_at,count(f.id) fundraiser_count,coalesce(sum(f.total_minor),0) total_minor,max(f.updated_at) last_fundraiser_at
  from public.profiles p
  left join public.fundraiser_members m on m.user_id=p.id
  left join public.fundraisers f on f.id=m.fundraiser_id
  where normalized is null or p.display_name ilike '%'||normalized||'%'
  group by p.id,p.display_name,p.created_at
 ), bounded as (
  select * from user_totals
  where page_cursor is null or (created_at,id)<((page_cursor->>'createdAt')::timestamptz,(page_cursor->>'id')::uuid)
  order by created_at desc,id desc limit page_size+1
 ), numbered as(select *,row_number() over(order by created_at desc,id desc) rn from bounded)
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id,'displayName',display_name,'fundraiserCount',fundraiser_count,'totalMinor',total_minor,
  'lastFundraiserAt',last_fundraiser_at,'createdAt',created_at
 ) order by created_at desc,id desc) filter(where rn<=page_size),'[]'),count(*) into items,n from numbered;
 if n>page_size then cursor_result:=jsonb_build_object('createdAt',items->(page_size-1)->>'createdAt','id',items->(page_size-1)->>'id'); end if;
 perform private.record_admin_audit('admin.users.list','admin','users',jsonb_build_object('pageSize',page_size,'hasSearch',normalized is not null));
 return jsonb_build_object('users',items,'nextCursor',cursor_result);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
 raise sqlstate 'PT422' using message='Invalid page cursor';
end $$;
revoke all on function private.admin_users(jsonb,integer,text) from public,anon;
grant execute on function private.admin_users(jsonb,integer,text) to authenticated;

create function public.admin_users(page_cursor jsonb default null,page_size integer default 25,search text default null) returns jsonb
language sql security invoker set search_path=''
as $$ select private.admin_users(page_cursor,page_size,search) $$;
revoke all on function public.admin_users(jsonb,integer,text) from public,anon;
grant execute on function public.admin_users(jsonb,integer,text) to authenticated;
