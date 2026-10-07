type HealthStatus='ok'|'degraded';
type SupabaseCheck='ok'|'missing_config'|'unreachable';
export interface ReadinessConfig{url?:string;publishableKey?:string}
export interface ReadinessResult{status:HealthStatus;checks:{supabase:SupabaseCheck}}

export async function readiness(config:ReadinessConfig,fetcher:typeof fetch=fetch):Promise<ReadinessResult>{
 if(!config.url||!config.publishableKey)return {status:'degraded',checks:{supabase:'missing_config'}};
 try{
  const reply=await fetcher(config.url.replace(/\/$/,'')+'/rest/v1/',{method:'GET',headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(5000),redirect:'error'});
  if(reply.ok)return {status:'ok',checks:{supabase:'ok'}};
 }catch{}
 return {status:'degraded',checks:{supabase:'unreachable'}};
}
