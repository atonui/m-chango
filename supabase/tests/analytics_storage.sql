begin;
do $$ begin
 if (select enabled from private.analytics_configuration) then raise exception 'FAIL: collection enabled by default'; end if;
 if has_table_privilege('authenticated','private.product_events','INSERT') then raise exception 'FAIL: browser event injection'; end if;
end $$;
insert into private.product_events(id,event_name,expires_at) values(gen_random_uuid(),'fundraiser_created',now()-interval '1 day'),(gen_random_uuid(),'fundraiser_closed',now()+interval '1 day');
insert into private.product_events(id,event_name,source) values(gen_random_uuid(),'contribution_added','manual');
insert into private.product_events(id,event_name,source,row_count) values(gen_random_uuid(),'import_completed','whatsapp',5);
do $$ begin
 begin
  insert into private.product_events(id,event_name,source) values(gen_random_uuid(),'public_fundraiser_viewed','manual');
  raise exception 'FAIL: public view accepted source payload';
 exception when check_violation then null; end;
end $$;
do $$ begin
 if private.expire_product_events(now())<>1 then raise exception 'FAIL: retention expiry'; end if;
 if (select count(*) from private.product_events)<>3 then raise exception 'FAIL: unexpired event deleted'; end if;
end $$;
rollback;
