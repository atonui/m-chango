import {env} from 'cloudflare:workers';
import {SupabaseRpc} from '../../../lib/server/supabase-rpc';
import {withOrganizer} from '../../../lib/server/organizer-auth';
import {requestAccessToken} from '../../../lib/server/account-session';
import {boundary,response,assertSameOrigin,jsonBody} from '../../../lib/server/http';
import {DomainError} from '../../../lib/domain/types';
export const dynamic='force-dynamic';
function handle(req:Request){return boundary(async()=>{
 const bindings=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;PRIVACY_NOTICE_READY?:string};
 if(!bindings.SUPABASE_URL||!bindings.SUPABASE_PUBLISHABLE_KEY)throw new DomainError('The account release is not configured yet.',503);
 const rpc=new SupabaseRpc({url:bindings.SUPABASE_URL,publishableKey:bindings.SUPABASE_PUBLISHABLE_KEY},requestAccessToken(req));
 if(req.method==='GET'){
  if(new URL(req.url).searchParams.get('action')==='export')return response(await rpc.call('export_account_data',{}),200,{'Content-Disposition':'attachment; filename="m-chango-account.json"'});
  const choices=await rpc.call('get_privacy_choices',{}) as {noticeReady?:boolean};
  return response({choices,noticeReady:bindings.PRIVACY_NOTICE_READY==='1'&&choices.noticeReady===true});
 }
 assertSameOrigin(req);
 const body=await jsonBody(req) as Record<string,unknown>;
 if(!body||typeof body!=='object'||Array.isArray(body))throw new DomainError('Invalid request.');
 if(body.action==='delete-request'){
  if(body.confirmation!=='REQUEST DELETION')throw new DomainError('Confirm your deletion request.');
  return response(await rpc.call('request_account_deletion',{}),202);
 }
 if((body.research===true||body.marketing===true)&&bindings.PRIVACY_NOTICE_READY!=='1')throw new DomainError('Optional privacy choices are not available yet.',503);
 if(typeof body.research!=='boolean'||typeof body.marketing!=='boolean')throw new DomainError('Choose each option separately.');
 return response(await rpc.call('save_privacy_choices',{research:body.research,marketing:body.marketing,notice_version:'2026-10-01'}));
})}
function authenticated(req:Request){return boundary(async()=>{const b=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};if(!b.SUPABASE_URL||!b.SUPABASE_PUBLISHABLE_KEY)throw new DomainError("Sign-in is not configured.",503);return withOrganizer(req,{url:b.SUPABASE_URL,publishableKey:b.SUPABASE_PUBLISHABLE_KEY},verified=>handle(verified))})}
export const GET=authenticated;export const POST=authenticated;
