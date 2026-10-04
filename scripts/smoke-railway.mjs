import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=3187,origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/vinext/dist/cli.js','start','--port',String(port)],{env:{...process.env,ACCOUNT_RELEASE:'1',SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key',APP_ORIGIN:`https://127.0.0.1:${port}`,VINEXT_TRUSTED_HOSTS:`127.0.0.1:${port}`,GOOGLE_AUTH_READY:'0',EMAIL_AUTH_READY:'0'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
try{
 let ready=false;
 for(let n=0;n<100;n++){if(child.exitCode!==null)throw new Error(output);try{const r=await fetch(origin+'/api/health');if(r.ok){ready=true;break}}catch{}await delay(100)}
 if(!ready)throw new Error('Server did not start: '+output);
 for(const [path,status,needle] of [['/privacy',200,'Some policy details are awaiting confirmation.'],['/api/health',200,'"status":"ok"'],['/how-it-works',200,'Your fundraiser, in three steps.'],['/signin',200,'email'],['/',200,'M-Chango'],['/api/fundraisers',404,'Not found'],['/manage/test',404,'Not found'],['/api/account/fundraisers',401,'Sign in'],['/api/auth/options',200,'"google":false']]){
  const r=await fetch(origin+path,{headers:{'X-Forwarded-Proto':'https'}});const body=await r.text();if(r.status!==status||!body.toLowerCase().includes(needle.toLowerCase()))throw new Error(`${path}: expected ${status}, got ${r.status}: ${body.slice(0,300)}`);console.log(`PASS ${path} (${status})`);
 }
}finally{child.kill('SIGTERM')}
