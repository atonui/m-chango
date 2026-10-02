import type {SupabaseConfig} from './supabase-rpc';
import {OrganizerAuth,EMAIL,readCookie,safeReturnPath} from './organizer-auth';
import {DomainError} from '../domain/types';
import {boundary,response,assertSameOrigin,jsonBody} from './http';
export interface AuthConfig extends SupabaseConfig{origin:string;googleReady:boolean;emailReady:boolean;rateLimit?:(key:string)=>Promise<boolean>;clientIp?:(request:Request)=>string|null}
export function handleAuth(req:Request,config:AuthConfig,action:string){
 const auth=new OrganizerAuth(config,req);
 return boundary(async()=>{
  if(new URL(req.url).origin!==config.origin)throw new DomainError('This sign-in address is not configured.',403);
  if(req.method==='GET'&&action==='options')return response({google:config.googleReady,email:config.emailReady});
  if(req.method==='GET'&&action==='complete'){
   const u=new URL(req.url);
   try{const next=await auth.complete(u.searchParams.get('code')??'',u.searchParams.get('flow')??'');return new Response(null,{status:303,headers:{Location:config.origin+next}})}catch{auth.set('__Host-m_chango_auth_state','',0);auth.set('__Host-m_chango_pkce','',0);return new Response(null,{status:303,headers:{Location:config.origin+'/signin?error=expired'}})}
  }
  if(req.method!=='POST')throw new DomainError('Unsupported request.',405);
  assertSameOrigin(req);
  if(action==='logout'){try{await auth.logout()}catch(e){if(!(e instanceof DomainError)||e.status!==401)throw e}return response({signedOut:true})}
  if(action==='session'){const {user}=await auth.session();return response({user:{id:user.id,email:user.email}})}
  if(!config.rateLimit)throw new DomainError('Sign-in is not configured yet.',503);
  const ip=config.clientIp?config.clientIp(req):req.headers.get('CF-Connecting-IP');if(!ip)throw new DomainError('Sign-in is not configured yet.',503);
  // Hosting adapter supplies the trusted ingress IP; no raw IP enters logs or analytics.
  if(!await config.rateLimit('auth:'+ip))throw new DomainError('Too many attempts. Wait a minute and try again.',429);
  const raw=await jsonBody(req);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DomainError('Invalid sign-in request.');const body=raw as Record<string,unknown>;
  if(action==='google'){
   if(!config.googleReady)throw new DomainError('Google sign-in is not available yet.',503);
   return response({url:await auth.google(config.origin,safeReturnPath(body.returnTo))});
  }
  if(!config.emailReady)throw new DomainError('Email sign-in is not available yet.',503);
  if(action==='email'){
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email))throw new DomainError('Enter a valid email address.');
   await auth.sendEmail(body.email.trim().toLowerCase());return response({sent:true});
  }
  if(action==='verify'){
   const email=readCookie(req,EMAIL);if(!email||typeof body.code!=='string'||!/^\d{6,8}$/.test(body.code))throw new DomainError('Enter the code sent to your email.',422);
   await auth.verifyEmail(email,body.code);return response({next:'/dashboard'});
  }
  throw new DomainError('Unsupported sign-in action.',404);
 }).then(r=>auth.finish(r));
}
