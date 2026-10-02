create index contributions_duplicate_pair on public.contributions
 (fundraiser_id,lower(regexp_replace(trim(normalize(display_name,NFKC)),'\s+',' ','g')),amount_minor) where removed_at is null;
create function public.check_import_duplicates(public_id text,rows jsonb) returns jsonb
language plpgsql stable security invoker set search_path=''
as $$ declare f public.fundraisers; result jsonb; begin
 if auth.uid() is null then raise sqlstate 'PT401' using message='Organizer identity required'; end if;
 select * into f from public.fundraisers x where x.public_id=check_import_duplicates.public_id and private.owns_fundraiser(x.id);
 if not found then raise sqlstate 'PT404' using message='Fundraiser not found'; end if;
 if f.status<>'active' then raise sqlstate 'PT409' using message='Reopen before adding entries'; end if;
 if rows is null or jsonb_typeof(rows)<>'array' then raise sqlstate 'PT422' using message='Expected candidate rows'; end if;
 if jsonb_array_length(rows)>500 then raise sqlstate 'PT422' using message='Review at most 500 rows'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.value->>'id','referenceExists',
  exists(select 1 from public.contributions c where c.fundraiser_id=f.id and c.transaction_reference=nullif(upper(trim(r.value->>'transactionReference')),'')),
  'possibleDuplicate',exists(select 1 from public.contributions c where c.fundraiser_id=f.id and c.removed_at is null
   and lower(regexp_replace(trim(normalize(c.display_name,NFKC)),'\s+',' ','g'))=lower(regexp_replace(trim(normalize(r.value->>'displayName',NFKC)),'\s+',' ','g'))
   and c.amount_minor=(r.value->>'amountMinor')::bigint)) order by r.ordinality),'[]') into result
 from jsonb_array_elements(rows) with ordinality r;
 return jsonb_build_object('rows',result,'expectedVersion',f.record_version);
end $$;
revoke all on function public.check_import_duplicates(text,jsonb) from public,anon;
grant execute on function public.check_import_duplicates(text,jsonb) to authenticated;
