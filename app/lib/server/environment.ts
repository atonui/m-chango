export type AppEnvironment='local'|'staging'|'production';

export interface RuntimeEnvironment{
 name:AppEnvironment;
 appOrigin:string|null;
 supabaseUrl:string|null;
 supabaseProjectRef:string|null;
 gitCommit:string|null;
 deployLabel:string|null;
}

function environmentName(bindings:Record<string,string|undefined>):AppEnvironment{
 const explicit=bindings.APP_ENV?.toLowerCase();
 if(explicit==='production'||explicit==='staging'||explicit==='local')return explicit;
 const railway=bindings.RAILWAY_ENVIRONMENT_NAME?.toLowerCase();
 if(railway==='production'||railway==='staging')return railway;
 return 'local';
}

function supabaseProjectRef(url:string|null){
 if(!url)return null;
 try{
  const host=new URL(url).hostname;
  return host.endsWith('.supabase.co')?host.slice(0,-'.supabase.co'.length)||null:null;
 }catch{return null}
}

export function runtimeEnvironment(bindings:Record<string,string|undefined>):RuntimeEnvironment{
 const supabaseUrl=bindings.SUPABASE_URL??null;
 return {
  name:environmentName(bindings),
  appOrigin:bindings.APP_ORIGIN??null,
  supabaseUrl,
  supabaseProjectRef:supabaseProjectRef(supabaseUrl),
  gitCommit:bindings.RAILWAY_GIT_COMMIT_SHA??bindings.GIT_COMMIT_SHA??null,
  deployLabel:bindings.RAILWAY_SERVICE_NAME??bindings.RAILWAY_PUBLIC_DOMAIN??null
 };
}
