import {env} from 'cloudflare:workers';
import {readiness} from '../../../lib/server/health';
export const dynamic='force-dynamic';
export async function GET(){
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 const body=await readiness({url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY});
 return Response.json(body,{status:body.status==='ok'?200:503,headers:{'Cache-Control':'no-store'}});
}
