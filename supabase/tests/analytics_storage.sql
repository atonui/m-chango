begin;
do $$ begin
 if (select enabled from private.analytics_configuration) then raise exception 'FAIL: collection enabled by default'; end if;
 if has_table_privilege('authenticated','private.product_events','INSERT') then raise exception 'FAIL: browser event injection'; end if;
end $$;
insert into private.product_events(id,event_name,expires_at) values(gen_random_uuid(),'fundraiser_created',now()-interval '1 day'),(gen_random_uuid(),'fundraiser_closed',now()+interval '1 day');
do $$ begin
 if private.expire_product_events(now())<>1 then raise exception 'FAIL: retention expiry'; end if;
 if (select count(*) from private.product_events)<>1 then raise exception 'FAIL: unexpired event deleted'; end if;
end $$;
rollback;
