import {expect,it} from 'vitest';
import {handleSupabaseRequest} from '../../app/lib/server/supabase-handler';
const config={url:'https://example.test',publishableKey:'test'};
it('rejects unauthenticated creation before sending a database request',async()=>{
 const req=new Request('https://m-chango.test/api/ledger',{method:'POST',headers:{Origin:'https://m-chango.test','Content-Type':'application/json'},body:JSON.stringify({title:'Fundraiser',paymentNumber:'0700000000'})});
 expect((await handleSupabaseRequest(req,config)).status).toBe(401);
});
it('rejects cross-origin writes before database access',async()=>{
 const req=new Request('https://m-chango.test/api/ledger',{method:'POST',headers:{Origin:'https://other.test'},body:'{}'});
 expect((await handleSupabaseRequest(req,config)).status).toBe(403);
});
it('rejects legacy secret session exchange',async()=>{
 const req=new Request('https://m-chango.test/api/ledger/example/manage/session',{method:'POST',headers:{Origin:'https://m-chango.test'},body:'{}'});
 expect((await handleSupabaseRequest(req,config)).status).toBe(404);
});
