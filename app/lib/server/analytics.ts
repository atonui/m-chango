import {type EventName,validateAnalyticsEvent} from '../domain/analytics';
import {type SupabaseRpc} from './supabase-rpc';

type Source='manual'|'whatsapp'|'mpesa';

export async function recordProductEvent(rpc:SupabaseRpc,args:{publicId:string;name:Exclude<EventName,'public_fundraiser_viewed'|'contribution_list_copied'>;source?:Source;rowCount?:number}):Promise<void>{
 try{
  validateAnalyticsEvent({id:crypto.randomUUID(),name:args.name,timestamp:new Date().toISOString(),source:args.source,rowCount:args.rowCount});
  await rpc.call('record_product_event',{public_id:args.publicId,event_name:args.name,source:args.source??null,row_count:args.rowCount??null});
 }catch{}
}

export async function recordPublicProductEvent(rpc:SupabaseRpc,args:{publicId:string;name:'public_fundraiser_viewed'|'contribution_list_copied'}):Promise<void>{
 try{
  validateAnalyticsEvent({id:crypto.randomUUID(),name:args.name,timestamp:new Date().toISOString()});
  await rpc.call('record_public_product_event',{public_id:args.publicId,event_name:args.name});
 }catch{}
}
