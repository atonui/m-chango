import {env} from 'cloudflare:workers';
import {handleSupabaseRequest} from '../../../lib/server/supabase-handler';
import {withOrganizer} from '../../../lib/server/organizer-auth';
import {response} from '../../../lib/server/http';
export const dynamic='force-dynamic';
function handle(req:Request){
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 if(!bindings.SUPABASE_URL||!bindings.SUPABASE_PUBLISHABLE_KEY)return response({error:'The account release is not configured yet.'},503);
 const config={url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY};
 const parts=new URL(req.url).pathname.split('/').filter(Boolean).slice(2);
 if(req.method==='GET'&&parts.length>0&&(parts.length===1||parts[1]==='entries'))return handleSupabaseRequest(req,config);
 return withOrganizer(req,config,verified=>handleSupabaseRequest(verified,config));
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
