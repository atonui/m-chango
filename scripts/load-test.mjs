// Public-read load harness. No seeding, private tokens or production writes.
import {performance} from 'node:perf_hooks';
const base=process.env.MCHANGO_TEST_ORIGIN;
if(!base||process.env.MCHANGO_TEST_ENV!=='development'||base!==process.env.MCHANGO_ALLOWED_TEST_ORIGIN)throw Error('Set an explicitly approved development origin and MCHANGO_TEST_ENV=development.');
const origin=new URL(base).origin;
if(origin!==base)throw Error('Origin must contain no path or credentials.');
const ids=JSON.parse(process.env.MCHANGO_TEST_PUBLIC_IDS??'[]');
if(!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id)))throw Error('Supply synthetic fundraiser public IDs.');
const concurrency=Number(process.env.MCHANGO_TEST_CONCURRENCY??100),duration=Number(process.env.MCHANGO_TEST_SECONDS??900);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>100||!Number.isInteger(duration)||duration<1||duration>900)throw Error('Concurrency 1–100; duration 1–900 seconds.');
const end=performance.now()+duration*1000;const histogram=new Uint32Array(30001);let requests=0,errors=0,totalMs=0;
await Promise.all(Array.from({length:concurrency},async(_,i)=>{
 while(performance.now()<end){const start=performance.now();try{
  const id=ids[(requests+i)%ids.length];
  const response=await fetch(origin+'/api/ledger/'+id,{signal:AbortSignal.timeout(15000),redirect:'error'});
  await response.arrayBuffer();if(!response.ok)errors++;
 }catch{errors++}
 const elapsed=performance.now()-start;histogram[Math.min(30000,Math.ceil(elapsed))]++;totalMs+=elapsed;requests++;
 }
}));
let cumulative=0,p95=30000;for(let i=0;i<histogram.length;i++){cumulative+=histogram[i];if(cumulative>=requests*.95){p95=i;break}}
const result={scenario:'public-summary-only',concurrency,durationSeconds:duration,requests,errors,errorRate:requests?errors/requests:1,p95Ms:p95,meanMs:requests?totalMs/requests:0};
console.log(JSON.stringify(result));
if(result.errorRate>=.01||result.p95Ms>=1000)process.exitCode=1;
