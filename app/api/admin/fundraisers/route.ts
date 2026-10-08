import {env} from 'cloudflare:workers';
import {handleAdminFundraisers} from '../../../lib/server/admin-routes';

export const dynamic='force-dynamic';

export function GET(req:Request){
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 return handleAdminFundraisers(req,{url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY});
}
