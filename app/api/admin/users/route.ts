import {env} from 'cloudflare:workers';
import {handleAdminUsers} from '../../../lib/server/admin-routes';

export const dynamic='force-dynamic';

export function GET(req:Request){
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 return handleAdminUsers(req,{url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY});
}
