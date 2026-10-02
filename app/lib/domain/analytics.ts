import {DomainError} from './types';
export type EventName='fundraiser_created'|'import_completed'|'contribution_list_copied'|'fundraiser_closed';
export interface AnalyticsEvent{id:string;name:EventName;timestamp:string;organizerId?:string;fundraiserId?:string;source?:'manual'|'whatsapp'|'mpesa';rowCount?:number}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const names=new Set(['fundraiser_created','import_completed','contribution_list_copied','fundraiser_closed']);
const keys=new Set(['id','name','timestamp','organizerId','fundraiserId','source','rowCount']);
export function validateAnalyticsEvent(input:unknown):AnalyticsEvent{
 const invalid=()=>new DomainError('Invalid analytics event.',422);
 if(!input||typeof input!=='object'||Array.isArray(input))throw invalid();
 const e=input as Record<string,unknown>;
 if(Object.keys(e).some(key=>!keys.has(key))||typeof e.id!=='string'||!uuid.test(e.id)||typeof e.name!=='string'||!names.has(e.name))throw invalid();
 if(typeof e.timestamp!=='string'||!/^\d{4}-\d\d-\d\dT/.test(e.timestamp)||!Number.isFinite(Date.parse(e.timestamp)))throw invalid();
 for(const key of ['organizerId','fundraiserId'])if(e[key]!==undefined&&(typeof e[key]!=='string'||!uuid.test(e[key] as string)))throw invalid();
 if(e.source!==undefined&&(e.name!=='import_completed'||!['manual','whatsapp','mpesa'].includes(String(e.source))))throw invalid();
 if(e.rowCount!==undefined&&(e.name!=='import_completed'||!Number.isInteger(e.rowCount)||Number(e.rowCount)<1||Number(e.rowCount)>500))throw invalid();
 return {...e} as unknown as AnalyticsEvent;
}
