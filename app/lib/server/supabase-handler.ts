import {DomainError,type PrivateLedger,type CommitResult} from '../domain/types';
import {validateFundraiser,validateContribution,object,version,operationKey} from '../domain/validation';
import {boundary,response,assertSameOrigin,jsonBody} from './http';
import {SupabaseRpc,type SupabaseConfig} from './supabase-rpc';
import {ledgerCsv} from '../domain/csv';
import {parseWhatsApp} from '../import/whatsapp';
import {parseMpesa} from '../import/mpesa';
import {classifyDuplicates} from '../import/duplicates';
import {parseKes} from '../domain/money';
import {requestAccessToken} from './account-session';

/** Release API: Supabase validates bearer identity; capability links never authorize. */
export function handleSupabaseRequest(req:Request,config:SupabaseConfig):Promise<Response>{return boundary(async()=>{
 const url=new URL(req.url),[publicId,access,action,eid]=url.pathname.split('/').filter(Boolean).slice(2);
 const method=req.method;
 if(method!=='GET')assertSameOrigin(req);
 if(access==='manage'&&(action==='session'||action==='rotate'))throw new DomainError('Not found.',404);
 const token=requestAccessToken(req);
 const rpc=new SupabaseRpc(config,token);
 if(!publicId&&method==='POST'){
  if(!token)throw new DomainError('Sign in to manage your fundraisers.',401);
  const x=validateFundraiser(await jsonBody(req));
  return response(await rpc.call('create_fundraiser',{payload:x}),201);
 }
 if(!publicId)throw new DomainError('Not found.',404);
 if(!access&&method==='GET')return response(await rpc.call('public_summary',{public_id:publicId}));
 if(access==='entries'&&method==='GET'){
  let cursor:unknown=null;
  if(url.searchParams.has('cursor'))try{cursor=JSON.parse(url.searchParams.get('cursor')!)}catch{throw new DomainError('Invalid page cursor.',422)}
  const size=Number(url.searchParams.get('limit')??50);
  if(!Number.isInteger(size)||size<1||size>100)throw new DomainError('Choose a page size from 1 to 100.',422);
  return response(await rpc.call('public_entries',{public_id:publicId,page_cursor:cursor,page_size:size}));
 }
 if(access!=='manage')throw new DomainError('Not found.',404);
 if(!token)throw new DomainError('Sign in to manage your fundraisers.',401);
 if(!action&&method==='GET'){
  let cursor:unknown=null;
  if(url.searchParams.has('cursor'))try{cursor=JSON.parse(url.searchParams.get('cursor')!)}catch{throw new DomainError('Invalid page cursor.',422)}
  const size=Number(url.searchParams.get('limit')??50);
  if(!Number.isInteger(size)||size<1||size>100)throw new DomainError('Choose a page size from 1 to 100.',422);
  return response(await rpc.call('private_ledger_page',{public_id:publicId,page_cursor:cursor,page_size:size}));
 }
 if(action==='export'&&method==='GET'){
  const snapshot=await rpc.call<PrivateLedger>('export_snapshot',{public_id:publicId});
  return new Response(ledgerCsv(snapshot),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="m-chango-contributions.csv"','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 if(action==='snapshot'&&method==='GET')return response(await rpc.call('export_snapshot',{public_id:publicId}));
 const b=object(await jsonBody(req));
 if(action==='survey'&&method==='POST'){
  if(!['achieved','partly_achieved','not_achieved','prefer_not_to_say'].includes(String(b.outcome))||
   (b.feedback!==undefined&&(typeof b.feedback!=='string'||b.feedback.length>2000)))throw new DomainError('Review the survey values.');
  return response(await rpc.call('save_closing_survey',{public_id:publicId,outcome:b.outcome,feedback:b.feedback??null}));
 }
 if(action==='preview'&&method==='POST'){
  if(typeof b.text!=='string'||!['whatsapp','mpesa'].includes(b.kind as string))throw new DomainError('Choose a supported format.');
  const preview=b.kind==='mpesa'?parseMpesa(b.text):parseWhatsApp(b.text);
  if(preview.rows.length>500)throw new DomainError('Review at most 500 rows per import.');
  const rows=classifyDuplicates(preview.rows,[]);
  const candidates=rows.flatMap(row=>{try{return [{id:row.id,displayName:row.displayName,amountMinor:parseKes(row.amount),transactionReference:row.transactionReference}]}catch{return []}});
  const checked=await rpc.call<{rows:{id:string;referenceExists:boolean;possibleDuplicate:boolean}[];expectedVersion:number}>('check_import_duplicates',{public_id:publicId,rows:candidates});
  const flags=new Map(checked.rows.map(r=>[r.id,r]));
  return response({...preview,expectedVersion:checked.expectedVersion,rows:rows.map(row=>{
   const flag=flags.get(row.id);
   if(flag?.referenceExists)return {...row,selected:false,blockingError:'Reference already recorded. Restore or correct the existing entry.'};
   if(flag?.possibleDuplicate)return {...row,selected:false,issues:[...row.issues,'Possible duplicate: include only if this is a separate contribution.']};
   return row;
  })});
 }
 const args={public_id:publicId,expected_version:version(b.expectedVersion)};
 if(!action&&method==='PATCH')return response(await rpc.call('update_fundraiser',{...args,payload:validateFundraiser(b)}));
 if((action==='import'||action==='contributions'&&!eid)&&method==='POST'){
  if(b.confirmedReceived!==true)throw new DomainError('Confirm these contributions were received.');
  const raw=action==='import'?b.rows:[b];
  if(!Array.isArray(raw)||raw.length<1||raw.length>500)throw new DomainError('Select 1–500 valid entries.');
  return response(await rpc.call<CommitResult>('commit_contributions',{...args,operation_key:operationKey(b.idempotencyKey),rows:raw.map(validateContribution)}),201);
 }
 if(action==='contributions'&&eid&&method==='PATCH'){
  if(b.action==='edit')return response(await rpc.call('edit_contribution',{...args,entry_id:eid,payload:validateContribution(b)}));
  if(b.action==='remove'||b.action==='restore')return response(await rpc.call('set_contribution_removed',{...args,entry_id:eid,removed:b.action==='remove'}));
 }
 throw new DomainError('Not found.',404);
})}
