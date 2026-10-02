import {spawn} from 'node:child_process';
import {request} from 'node:https';
import assert from 'node:assert/strict';
const port=8791;
const worker=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--ip','127.0.0.1','--port',String(port),'--inspector-port','0','--local-protocol','https','--upstream-protocol','https','--var','SUPABASE_PUBLISHABLE_KEY:public-smoke-test','--var',`APP_ORIGIN:https://127.0.0.1:${port}`,'--log-level','error'],{env:{...process.env,CLOUDFLARE_CF_FETCH_ENABLED:'false',WRANGLER_SEND_METRICS:'false'},stdio:['ignore','pipe','pipe']});
let log='';for(const stream of [worker.stdout,worker.stderr])stream.on('data',d=>{if(log.length<20000)log+=d});
function call(path,method='GET',body){return new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port,path,method,rejectUnauthorized:false,headers:{Host:`127.0.0.1:${port}`,Origin:`https://127.0.0.1:${port}`,'Content-Type':'application/json'}},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}))});req.on('error',reject);req.setTimeout(1000,()=>req.destroy(new Error('Local smoke request timed out')));if(body)req.write(body);req.end()})}
try{
 let options;for(let attempt=0;attempt<30;attempt++){try{options=await call('/api/auth/options');break}catch{await new Promise(r=>setTimeout(r,500))}}
 if(!options)throw new Error('Local Worker did not start: '+log.slice(-3000));
 assert.equal(options.status,200,options.text+"\n"+log.slice(-1200));assert.deepEqual(JSON.parse(options.text),{google:false,email:false});
 const signin=await call('/signin');assert.equal(signin.status,200);assert.match(signin.text,/Sign in to M-Chango/);
 const home=await call('/');assert.equal(home.status,200);assert.match(home.text,/Your fundraising account/);
 assert.equal((await call('/api/fundraisers')).status,404);
 const session=await call('/api/auth/session','POST','{}');assert.equal(session.status,401);assert.match(session.headers['cache-control'],/no-store/);assert.ok(session.headers['set-cookie'].some(c=>c.startsWith('__Host-m_chango_access_token=')&&c.includes('Max-Age=0')));
 console.log(JSON.stringify({workerSmoke:'passed',checks:5,liveProviderAuth:false}));
}finally{worker.kill('SIGTERM')}
