begin;
insert into auth.users(id) values ('42000000-0000-4000-8000-000000000001');
insert into auth.sessions(id,user_id) values ('42000000-0000-4000-8000-000000000101','42000000-0000-4000-8000-000000000001');
insert into public.profiles(id,auth_subject,display_name) values ('42000000-0000-4000-8000-000000000201','42000000-0000-4000-8000-000000000001','Admin Owner');
insert into private.admin_users(user_id,role) values ('42000000-0000-4000-8000-000000000201','owner');
insert into public.fundraisers(id,public_id,title,purpose,payment_number,total_minor,entry_count,created_at,updated_at)
values ('42000000-0000-4000-8000-000000000301','admintest','School Fund','Books','254700000000',150000,1,now(),now());
insert into public.fundraiser_members(fundraiser_id,user_id) values ('42000000-0000-4000-8000-000000000301','42000000-0000-4000-8000-000000000201');
insert into public.contributions(id,fundraiser_id,display_name,amount_minor,private_phone,source)
values ('42000000-0000-4000-8000-000000000401','42000000-0000-4000-8000-000000000301','Donor',150000,'254711111111','manual');

set local role authenticated;
select set_config('request.jwt.claim.sub','42000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"42000000-0000-4000-8000-000000000001","session_id":"42000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ declare fundraisers jsonb; users jsonb; begin
 fundraisers:=public.admin_fundraisers(null,10,'school');
 if jsonb_array_length(fundraisers->'fundraisers')<>1 then raise exception 'FAIL: fundraiser search count'; end if;
 if (fundraisers->'fundraisers'->0 ? 'paymentNumber') then raise exception 'FAIL: fundraiser list exposed payment number'; end if;
 users:=public.admin_users(null,10,'Admin');
 if jsonb_array_length(users->'users')<>1 then raise exception 'FAIL: user search count'; end if;
 if (users->'users'->0 ? 'authSubject') then raise exception 'FAIL: user list exposed auth subject'; end if;
end $$;
rollback;
