import {env} from 'cloudflare:workers';
import {SupabaseRpc} from '../../../lib/server/supabase-rpc';
import {boundary,response} from '../../../lib/server/http';
import {DomainError} from '../../../lib/domain/types';
import {withOrganizer} from '../../../lib/server/organizer-auth';
import {requestAccessToken} from '../../../lib/server/account-session';
export const dynamic='force-dynamic';
function handle(req:Request){return boundary(async()=>{
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
 if(!bindings.SUPABASE_URL||!bindings.SUPABASE_PUBLISHABLE_KEY)throw new DomainError('The account release is not configured yet.',503);
 const url=new URL(req.url),limit=Number(url.searchParams.get('limit')??20);
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new DomainError('Choose a page size from 1 to 50.',422);
 let cursor:unknown=null;
 if(url.searchParams.has('cursor'))try{cursor=JSON.parse(url.searchParams.get('cursor')!)}catch{throw new DomainError('Invalid page cursor.',422)}
 const token=requestAccessToken(req);
 const rpc=new SupabaseRpc({url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY},token);
 return response(await rpc.call('list_owned_fundraisers',{page_cursor:cursor,page_size:limit}));
})}

export function GET(req:Request){return boundary(async()=>{const b=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};if(!b.SUPABASE_URL||!b.SUPABASE_PUBLISHABLE_KEY)throw new DomainError("Sign-in is not configured.",503);return withOrganizer(req,{url:b.SUPABASE_URL,publishableKey:b.SUPABASE_PUBLISHABLE_KEY},verified=>handle(verified))})}
