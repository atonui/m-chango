import {createClient,type Session,type User} from '@supabase/supabase-js';
import {DomainError} from '../domain/types';
import type {SupabaseConfig} from './supabase-rpc';
import {requestAccessToken} from './account-session';
import {boundary,response} from './http';
export const ACCESS='__Host-m_chango_access_token',REFRESH='__Host-m_chango_refresh_token',VERIFIER='__Host-m_chango_pkce',STATE='__Host-m_chango_auth_state',EMAIL='__Host-m_chango_otp_email';
export function readCookie(req:Request,name:string):string|undefined{
 const values=(req.headers.get('cookie')??'').split(';').map(p=>p.trim()).filter(p=>p.startsWith(name+'='));
 if(values.length!==1)return;const raw=values[0].slice(name.length+1);if(raw.length>3800||!raw)return;
 try{return decodeURIComponent(raw)}catch{return}
}
export function authCookie(name:string,value:string,maxAge:number){
 const encoded=encodeURIComponent(value);if(encoded.length>3800)throw new DomainError('Unable to establish a session.',503);
 return `${name}=${encoded}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
}
export function safeReturnPath(value:unknown):string{
 if(typeof value!=='string'||value.length>512||/[\\\s%]/.test(value))return '/dashboard';
 return /^\/dashboard(?:\/[A-Za-z0-9/_-]*)?$/.test(value)?value:'/dashboard';
}
export class OrganizerAuth{
 readonly cookies:string[]=[];
 private client:ReturnType<typeof createClient>;
 constructor(private config:SupabaseConfig,readonly req:Request){
  const memory=new Map<string,string>();
  const verifierKey='m_chango_auth-code-verifier';
  const fetcher:typeof fetch=(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(15000)});
  this.client=createClient(config.url,config.publishableKey,{global:{fetch:fetcher},auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,flowType:'pkce',storageKey:'m_chango_auth',storage:{
   getItem:(key)=>key===verifierKey?readCookie(req,VERIFIER)??null:memory.get(key)??null,
   setItem:(key,value)=>{memory.set(key,value);if(key===verifierKey)this.set(VERIFIER,value,600)},
   removeItem:(key)=>{memory.delete(key);if(key===verifierKey)this.set(VERIFIER,'',0)},
  }}});
 }
 set(name:string,value:string,age:number){this.cookies.push(authCookie(name,value,age))}
 clear(){for(const n of [ACCESS,REFRESH,VERIFIER,STATE,EMAIL])this.set(n,'',0)}
 finish(reply:Response){const headers=new Headers(reply.headers);for(const c of this.cookies)headers.append('Set-Cookie',c);headers.set('Cache-Control','private, no-store');headers.set('Referrer-Policy','no-referrer');return new Response(reply.body,{status:reply.status,headers})}
 async verifyAccess(token:string):Promise<User>{
  const {data,error}=await this.client.auth.getUser(token);
  if(error&&(error.status===undefined||error.status===0||error.status>=500))throw new DomainError('Sign-in is temporarily unavailable. Try again.',503);
  if(error||!data.user||data.user.is_anonymous)throw new DomainError('Sign in to manage your fundraisers.',401);
  await this.active(token);
  return data.user;
 }
 private async active(token:string){
  const r=await fetch(this.config.url.replace(/\/$/,'')+'/rest/v1/rpc/organizer_session_valid',{method:'POST',headers:{apikey:this.config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(r.status>=500)throw new DomainError('Sign-in is temporarily unavailable. Try again.',503);
  if(!r.ok||await r.json()!==true)throw new DomainError('Sign in to manage your fundraisers.',401);
 }
 private async initializeProfile(token:string){
  const r=await fetch(this.config.url.replace(/\/$/,'')+'/rest/v1/rpc/ensure_organizer_profile',{method:'POST',headers:{apikey:this.config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new DomainError('Unable to prepare your account. Try signing in again.',503);
 }
 async session():Promise<{token:string;user:User}>{
  let token=requestAccessToken(this.req);
  if(this.req.headers.has('Authorization')){if(!token)throw new DomainError('Sign in to manage your fundraisers.',401);return {token,user:await this.verifyAccess(token)}}
  if(token){try{return {token,user:await this.verifyAccess(token)}}catch(e){if(!(e instanceof DomainError)||e.status!==401)throw e}}
  if([ACCESS,REFRESH].some(n=>(this.req.headers.get('cookie')??'').split(';').filter(p=>p.trim().startsWith(n+'=')).length>1)){this.clear();throw new DomainError('Sign in again.',401)}
  const refresh=readCookie(this.req,REFRESH);if(!refresh){this.clear();throw new DomainError('Sign in to manage your fundraisers.',401)}
  const {data,error}=await this.client.auth.refreshSession({refresh_token:refresh});
  if(error&&(error.status===undefined||error.status===0||error.status>=500))throw new DomainError('Sign-in is temporarily unavailable. Try again.',503);
  if(error||!data.session){this.clear();throw new DomainError('Your session ended. Sign in again.',401)}
  token=data.session.access_token;const user=await this.verifyAccess(token);this.save(data.session);return {token,user};
 }
 private save(session:Session){this.set(ACCESS,session.access_token,2592000);this.set(REFRESH,session.refresh_token,2592000)}
 async google(origin:string,returnTo:string){
  const nonce=crypto.randomUUID();this.set(STATE,nonce+'|'+safeReturnPath(returnTo),600);
  const {data,error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/complete?flow='+nonce,skipBrowserRedirect:true}});
  if(error||!data.url)throw new DomainError('Google sign-in is unavailable. Try email.',503);return data.url;
 }
 async complete(code:string,flow:string){
  const state=readCookie(this.req,STATE)?.split('|');if(!state||state.length!==2||state[0]!==flow||!readCookie(this.req,VERIFIER)||!code||code.length>2048)throw new DomainError('Sign-in expired. Start again.',401);
  const {data,error}=await this.client.auth.exchangeCodeForSession(code);this.set(STATE,'',0);this.set(VERIFIER,'',0);
  if(error||!data.session)throw new DomainError('Sign-in expired. Start again.',401);
  await this.verifyAccess(data.session.access_token);await this.initializeProfile(data.session.access_token);this.save(data.session);return safeReturnPath(state[1]);
 }
 async sendEmail(email:string){
  const {error}=await this.client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
  if(error)throw new DomainError('Unable to send a code. Wait a minute and try again.',error.status===429?429:503);
  this.set(EMAIL,email,600);
 }
 async verifyEmail(email:string,token:string){
  const {data,error}=await this.client.auth.verifyOtp({email,token,type:'email'});
  if(error||!data.session)throw new DomainError('That code is invalid or expired. Request a new code.',422);
  await this.verifyAccess(data.session.access_token);await this.initializeProfile(data.session.access_token);this.save(data.session);this.set(EMAIL,'',0);this.set(STATE,'',0);this.set(VERIFIER,'',0);
 }
 async logout(){
  try{const session=await this.session();const {error}=await this.client.auth.admin.signOut(session.token,'global');if(error)throw new DomainError('Unable to end your sessions. Try again.',503)}finally{this.clear()}
 }
}
export async function withOrganizer(req:Request,config:SupabaseConfig,action:(verified:Request,user:User)=>Promise<Response>){
 const auth=new OrganizerAuth(config,req);
 const reply=await boundary(async()=>{const {token,user}=await auth.session();const headers=new Headers(req.headers);headers.set('Authorization','Bearer '+token);return action(new Request(req,{headers}),user)});
 return auth.finish(reply);
}
