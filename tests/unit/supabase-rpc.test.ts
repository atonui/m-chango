import {createServer,type Server,type RequestListener} from 'node:http';
import {afterEach,expect,it} from 'vitest';
import {SupabaseRpc} from '../../app/lib/server/supabase-rpc';
let server:Server|undefined;
afterEach(async()=>{if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));server=undefined});
async function endpoint(handler:RequestListener){server=createServer(handler);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('No address');return `http://127.0.0.1:${address.port}`}
it('sends user-scoped RPC requests without reusing another identity',async()=>{
 const identities:string[]=[];
 const url=await endpoint((req,res)=>{identities.push(req.headers.authorization??'');expect(req.url).toBe('/rest/v1/rpc/list_owned_fundraisers');expect(req.headers.apikey).toBe('publishable-test');res.setHeader('Content-Type','application/json');res.end('{"totalMinor":12500}')});
 expect(await new SupabaseRpc({url,publishableKey:'publishable-test'},'user-a').call('list_owned_fundraisers',{})).toEqual({totalMinor:12500});
 await new SupabaseRpc({url,publishableKey:'publishable-test'},'user-b').call('list_owned_fundraisers',{});
 expect(identities).toEqual(['Bearer user-a','Bearer user-b']);
});
it('maps conflict without exposing raw database messages',async()=>{
 const url=await endpoint((_req,res)=>{res.statusCode=409;res.setHeader('Content-Type','application/json');res.end('{"code":"PT409","message":"PRIVATE donor detail"}')});
 await expect(new SupabaseRpc({url,publishableKey:'test'},'user').call('commit_contributions',{})).rejects.toMatchObject({status:409,message:'Refresh and review the latest changes before saving.'});
});
it('fails closed when private RPC has no user token',async()=>{
 await expect(new SupabaseRpc({url:'https://example.test',publishableKey:'test'}).call('commit_contributions',{})).rejects.toMatchObject({status:401});
});
it('requires identity for the fundraiser dashboard',async()=>{
 await expect(new SupabaseRpc({url:'https://example.test',publishableKey:'test'}).call('list_owned_fundraisers',{})).rejects.toMatchObject({status:401});
});
it('requires identity for paginated private ledger reads',async()=>{
 await expect(new SupabaseRpc({url:'https://example.test',publishableKey:'test'}).call('private_ledger_page',{})).rejects.toMatchObject({status:401});
});
it('requires identity for import duplicate checks',async()=>{
 await expect(new SupabaseRpc({url:'https://example.test',publishableKey:'test'}).call('check_import_duplicates',{})).rejects.toMatchObject({status:401});
});
it('does not attach expired account tokens to public fundraiser reads',async()=>{
 let authorization:string|undefined;
 const url=await endpoint((req,res)=>{authorization=req.headers.authorization;res.setHeader('Content-Type','application/json');res.end('{"totalMinor":100}')});
 expect(await new SupabaseRpc({url,publishableKey:'test'},'expired-token').call('public_summary',{public_id:'test'})).toEqual({totalMinor:100});
 expect(authorization).toBeUndefined();
});
