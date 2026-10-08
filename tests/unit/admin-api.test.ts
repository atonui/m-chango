import {afterEach,expect,it,vi} from 'vitest';
import {adminRpc} from '../../app/lib/server/admin';
import {handleAdminFundraisers,handleAdminOverview,handleAdminUsers} from '../../app/lib/server/admin-routes';

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

it('forwards admin fundraiser list filters to the RPC',async()=>{
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  expect(JSON.parse(String(init?.body))).toEqual({page_cursor:{updatedAt:'2026-10-08T10:00:00Z',id:'row-1'},page_size:10,search:'school'});
  return Response.json({fundraisers:[],nextCursor:null});
 }));
 const cursor=encodeURIComponent(JSON.stringify({updatedAt:'2026-10-08T10:00:00Z',id:'row-1'}));
 const response=await handleAdminFundraisers(new Request('https://app.test/api/admin/fundraisers?limit=10&q=school&cursor='+cursor,{headers:{Authorization:'Bearer user-token'}}),{url:'https://db.test',publishableKey:'public'});
 expect(response.status).toBe(200);
 expect(fetch).toHaveBeenCalledWith('https://db.test/rest/v1/rpc/admin_fundraisers',expect.any(Object));
});

it('rejects invalid admin list page sizes before hitting Supabase',async()=>{
 const fetchSpy=vi.fn();
 vi.stubGlobal('fetch',fetchSpy);
 const response=await handleAdminUsers(new Request('https://app.test/api/admin/users?limit=101',{headers:{Authorization:'Bearer user-token'}}),{url:'https://db.test',publishableKey:'public'});
 expect(response.status).toBe(422);
 expect(fetchSpy).not.toHaveBeenCalled();
});
