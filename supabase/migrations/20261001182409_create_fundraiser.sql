-- Elevated writes live in an unexposed schema; public wrapper runs as caller.
create function private.create_fundraiser(payload jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 subject uuid := auth.uid();
 actor uuid;
 f public.fundraisers;
begin
 if subject is null or not exists(select 1 from auth.users where id=subject and not coalesce(is_anonymous,false)) then
  raise insufficient_privilege using message='Organizer identity required';
 end if;
 insert into public.profiles(auth_subject) values(subject)
 on conflict(auth_subject) do nothing;
 select id into strict actor from public.profiles where auth_subject=subject;
 insert into public.fundraisers(title,purpose,payment_number,target_minor,public_names_enabled,category)
 values(trim(payload->>'title'),coalesce(payload->>'purpose',''),payload->>'paymentNumber',
  (payload->>'targetMinor')::bigint,coalesce((payload->>'publicNamesEnabled')::boolean,false),payload->>'category')
 returning * into f;
 insert into public.fundraiser_members(fundraiser_id,user_id) values(f.id,actor);
 insert into public.history(fundraiser_id,actor_user_id,action,new_value) values(f.id,actor,'create',to_jsonb(f));
 return jsonb_build_object('publicId',f.public_id,'recordVersion',f.record_version,'publicLink','/f/'||f.public_id);
end $$;
revoke all on function private.create_fundraiser(jsonb) from public,anon;
grant execute on function private.create_fundraiser(jsonb) to authenticated;
create function public.create_fundraiser(payload jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.create_fundraiser(payload) $$;
revoke all on function public.create_fundraiser(jsonb) from public,anon;
grant execute on function public.create_fundraiser(jsonb) to authenticated;
