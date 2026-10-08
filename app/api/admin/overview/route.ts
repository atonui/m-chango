import {env} from 'cloudflare:workers';
import {handleAdminOverview} from '../../../lib/server/admin-routes';

export const dynamic='force-dynamic';

export function GET(req:Request){
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 return handleAdminOverview(req,{url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY});
}
