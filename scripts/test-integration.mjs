import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
// Run the exact built Worker in Wrangler's pinned Miniflare/workerd runtime.
// Direct serving avoids Wrangler's live-reload proxy losing pooled connections
// after an early rejected body. No application writes are automatically retried.
const projectRequire=createRequire(resolve('package.json'));
const wranglerRequire=createRequire(projectRequire.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const main=resolve('dist/server',config.main);
const modules=[{type:'ESModule',path:main},...readdirSync('dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&resolve('dist/server',p)!==main).map(p=>({type:'ESModule',path:resolve('dist/server',p)}))];
const worker=new Miniflare({host:'127.0.0.1',port:Number(process.env.TEST_PORT||8787),modules,modulesRoot:resolve('dist/server'),compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:Object.fromEntries(config.d1_databases.map(d=>[d.binding,d.database_id])),d1Persist:resolve('.wrangler/state/v3/d1'),assets:{directory:resolve('dist/server',config.assets.directory),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},cf:false});
try{
 const url=await worker.ready;
 const ready=await fetch(url,{signal:AbortSignal.timeout(15000)});await ready.text();if(!ready.ok)throw new Error('Built Worker readiness failed: '+ready.status);
 const args=['--test','--test-concurrency=1'];if(process.env.TEST_PATTERN)args.push('--test-name-pattern',process.env.TEST_PATTERN);args.push('tests/integration/ledger.test.mjs');
 const tests=spawn(process.execPath,args,{env:{...process.env,TEST_BASE_URL:url.origin},stdio:'inherit',timeout:60000});process.exitCode=await new Promise(r=>tests.on('exit',c=>r(c??1)));
}catch(e){console.error(e.message);process.exitCode=1}
finally{await worker.dispose()}
