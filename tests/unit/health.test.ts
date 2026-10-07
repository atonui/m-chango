import {expect,it,vi} from 'vitest';
import {readiness} from '../../app/lib/server/health';

it('fails readiness when Supabase configuration is missing',async()=>{
 const result=await readiness({});
 expect(result.status).toBe('degraded');
 expect(result.checks.supabase).toBe('missing_config');
});

it('checks Supabase reachability without exposing secrets',async()=>{
 const fetcher=vi.fn(async()=>new Response('{}',{status:200}));
 const result=await readiness({url:'https://example.supabase.co',publishableKey:'publishable'},fetcher);
 expect(result).toEqual({status:'ok',checks:{supabase:'ok'}});
 expect(fetcher).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/health',expect.objectContaining({headers:{apikey:'publishable'},method:'GET'}));
 expect(JSON.stringify(result)).not.toContain('publishable');
});

it('reports degraded readiness when Supabase cannot be reached',async()=>{
 const result=await readiness({url:'https://example.supabase.co',publishableKey:'publishable'},async()=>new Response('{}',{status:503}));
 expect(result.status).toBe('degraded');
 expect(result.checks.supabase).toBe('unreachable');
});
