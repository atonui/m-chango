import {expect,it,vi,afterEach} from 'vitest';
import * as throttle from '../../app/lib/server/railway-throttle';
import {handleAuth,type AuthConfig} from '../../app/lib/server/auth-handler';
afterEach(()=>vi.unstubAllGlobals());
const secret='a'.repeat(64);
it('requires explicitly verified Railway ingress and a single valid remote IP',()=>{
 expect(throttle.railwayClientIp(new Request('https://app.test',{headers:{'X-Real-IP':'203.0.113.9'}}),false)).toBeNull();
 expect(throttle.railwayClientIp(new Request('https://app.test',{headers:{'CF-Connecting-IP':'203.0.113.9'}}),true)).toBeNull();
 for(const ip of ['spoof','203.0.113.9, 203.0.113.10',''])expect(throttle.railwayClientIp(new Request('https://app.test',{headers:{'X-Real-IP':ip}}),true)).toBeNull();
 expect(throttle.railwayClientIp(new Request('https://app.test',{headers:{'X-Real-IP':'203.0.113.9'}}),true)).toBe('203.0.113.9');
});
it('sends a pseudonymous key through the secret-gated RPC and no raw IP',async()=>{
 let body='';vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{body=init.body;return Response.json(true)}));
 expect(await throttle.checkRailwayLimit({url:'https://test.supabase.co',publishableKey:'public',secret},'auth:203.0.113.9')).toBe(true);
 const sent=JSON.parse(body);expect(sent.key_hash).toMatch(/^[0-9a-f]{64}$/);expect(body).not.toContain('203.0.113.9');expect(sent.server_token).toBe(secret);
});
it('honors database denial and fails closed on unavailable or invalid responses',async()=>{
 const config={url:'https://test.supabase.co',publishableKey:'public',secret};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(false)));expect(await throttle.checkRailwayLimit(config,'auth:203.0.113.9')).toBe(false);
 for(const reply of [Response.json(true,{status:500}),Response.json({success:true})]){vi.stubGlobal('fetch',vi.fn(async()=>reply));await expect(throttle.checkRailwayLimit(config,'auth:203.0.113.9')).rejects.toMatchObject({status:503})}
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('secret transport failure')}));await expect(throttle.checkRailwayLimit(config,'auth:203.0.113.9')).rejects.toMatchObject({status:503});
});
it('uses the configured ingress identity and never falls back to a spoofed Workers header',async()=>{
 const config:AuthConfig={url:'https://test.supabase.co',publishableKey:'public',origin:'https://app.test',googleReady:true,emailReady:false,rateLimit:async()=>true,clientIp:()=>null};
 const req=new Request('https://app.test/api/auth/google',{method:'POST',headers:{Origin:'https://app.test','CF-Connecting-IP':'203.0.113.9'},body:'{}'});
 expect((await handleAuth(req,config,'google')).status).toBe(503);
});
it('refuses to send the server capability to insecure or noncanonical URLs',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(true)));
 for(const url of ['http://test.supabase.co','https://user:password@test.supabase.co','https://test.supabase.co/other','https://test.supabase.co?query=yes']){
  await expect(throttle.checkRailwayLimit({url,publishableKey:'public',secret},'auth:203.0.113.9')).rejects.toMatchObject({status:503});
 }
});
