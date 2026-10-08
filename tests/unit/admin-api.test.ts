import {afterEach,expect,it,vi} from 'vitest';
import {adminRpc} from '../../app/lib/server/admin';
import {handleAdminOverview} from '../../app/lib/server/admin-routes';

afterEach(()=>vi.unstubAllGlobals());

it('rejects admin API requests without an organizer session before RPC',async()=>{
 const response=await handleAdminOverview(new Request('https://app.test/api/admin/overview'),{url:'https://db.test',publishableKey:'public'});
 expect(response.status).toBe(403);
 expect(await response.json()).toMatchObject({error:'Admin access required.'});
});

it('maps database admin denial to a generic forbidden response',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({code:'PT403',message:'private detail'},{status:403})));
 const response=await handleAdminOverview(new Request('https://app.test/api/admin/overview',{headers:{Authorization:'Bearer user-token'}}),{url:'https://db.test',publishableKey:'public'});
 expect(response.status).toBe(403);
 expect(await response.json()).toMatchObject({error:'Admin access required.'});
});

it('returns successful admin overview JSON from the RPC',async()=>{
 const calls:RequestInit[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{calls.push(init??{});return Response.json({role:'owner'})}));
 await expect(adminRpc(new Request('https://app.test',{headers:{Authorization:'Bearer user-token'}}),'admin_overview',{}, {url:'https://db.test',publishableKey:'public'})).resolves.toEqual({role:'owner'});
 expect(fetch).toHaveBeenCalledWith('https://db.test/rest/v1/rpc/admin_overview',expect.any(Object));
 expect((calls[0].headers as Record<string,string>).Authorization).toBe('Bearer user-token');
});
