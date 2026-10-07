import {DomainError} from '../domain/types';

export interface SupabaseConfig {url:string;publishableKey:string}
const publicCalls=new Set(['public_summary','public_entries','record_public_product_event']);
const calls=new Set([...publicCalls,'create_fundraiser','commit_contributions','edit_contribution','set_contribution_removed','update_fundraiser','export_snapshot','list_owned_fundraisers','private_ledger_page','check_import_duplicates','save_closing_survey','get_privacy_choices','save_privacy_choices','export_account_data','request_account_deletion','record_product_event']);

/** Per-request transport. Never store a user token in a shared singleton. */
export class SupabaseRpc {
 constructor(private config:SupabaseConfig,private accessToken?:string){}
 async call<T>(name:string,args:Record<string,unknown>):Promise<T>{
  if(!calls.has(name))throw new DomainError('Unsupported ledger operation.',422);
  if(!publicCalls.has(name)&&!this.accessToken)throw new DomainError('Sign in to manage your fundraisers.',401);
  let reply:Response;
  try{
   const headers:Record<string,string>={'Content-Type':'application/json',apikey:this.config.publishableKey};
   if(this.accessToken&&!publicCalls.has(name))headers.Authorization='Bearer '+this.accessToken;
   reply=await fetch(this.config.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args),signal:AbortSignal.timeout(15000),redirect:'error'});
  }catch{throw new DomainError('The ledger is temporarily unavailable. Keep your entries and try again.',503)}
  let data:unknown;
  try{data=await reply.json()}catch{throw new DomainError('The ledger returned an invalid response. Keep your entries and try again.',503)}
  if(reply.ok)return data as T;
  const code=typeof data==='object'&&data!==null&&'code' in data?String(data.code):'';
  if(code==='PT409'||code==='23505')throw new DomainError('Refresh and review the latest changes before saving.',409);
  if(code==='PT404')throw new DomainError('Fundraiser or contribution not found.',404);
  if(code==='PT401'||reply.status===401)throw new DomainError('Sign in to manage your fundraisers.',401);
  if(code==='PT422'||code==='23514'||code==='23502'||code==='22P02')throw new DomainError('Review the submitted values before saving.',422);
  if(reply.status===403)throw new DomainError('You do not have access to this operation.',403);
  throw new DomainError('The ledger is temporarily unavailable. Keep your entries and try again.',503);
 }
}
