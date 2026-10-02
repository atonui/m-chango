-- Bounded server-side mixed-RPC benchmark. Each invocation has an isolated synthetic ledger.
-- Does not measure HTTP, sessions, CDN or sustained production concurrency.
begin;
create temp table load_samples(kind text,ms double precision);
do $$ declare subject uuid:=gen_random_uuid(); pid text; rows jsonb; started timestamptz; version bigint:=1; i integer; begin
 insert into auth.users(id) values(subject);
 insert into auth.sessions(id,user_id) values(subject,subject);
 perform set_config('request.jwt.claim.sub',subject::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',subject::text,'session_id',subject::text,'role','authenticated')::text,true);
 pid:=public.create_fundraiser('{"title":"Synthetic load","paymentNumber":"0700000000"}')->>'publicId';
 select jsonb_agg(jsonb_build_object('displayName','Synthetic '||n,'amountMinor',10000,'source','manual')) into rows from generate_series(1,500) n;
 for i in 1..10 loop
 perform public.commit_contributions(pid,version,'seed-'||i,rows); version:=version+1;
 end loop;
 for i in 1..500 loop
 started:=clock_timestamp();
 if i%10=0 then
 perform public.commit_contributions(pid,version,'load-'||i,'[{"displayName":"Synthetic load","amountMinor":100,"source":"manual"}]'); version:=version+1;
 insert into load_samples values('write',extract(epoch from clock_timestamp()-started)*1000);
 elsif i%5=0 then
 perform public.public_entries(pid,null,50);
 insert into load_samples values('page',extract(epoch from clock_timestamp()-started)*1000);
 else
 perform public.public_summary(pid);
 insert into load_samples values('summary',extract(epoch from clock_timestamp()-started)*1000);
 end if;
 end loop;
 if (public.public_summary(pid)->>'entryCount')::integer<>5050 then raise exception 'FAIL: load counter'; end if;
end $$;
select kind,count(*) as requests,round(avg(ms)::numeric,3) as mean_ms,round(percentile_cont(.95) within group(order by ms)::numeric,3) as p95_ms,max(ms) as max_ms from load_samples group by kind;
rollback;
