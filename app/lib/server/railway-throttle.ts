import {isIP} from 'node:net';
import {DomainError} from '../domain/types';
import type {SupabaseConfig} from './supabase-rpc';

/** Trust only the documented Railway ingress IP after deployment verification. */
export function railwayClientIp(req:Request,verified:boolean):string|null{
 if(!verified)return null;
 const ip=req.headers.get('X-Real-IP');
 return ip&&isIP(ip)?ip.toLowerCase():null;
}
export async function checkRailwayLimit(config:SupabaseConfig&{secret:string},key:string):Promise<boolean>{
 const unavailable=()=>new DomainError('Sign-in is temporarily unavailable. Try again shortly.',503);
 if(!/^[0-9a-f]{64}$/.test(config.secret))throw unavailable();
 try{
  const endpoint=new URL(config.url);
  if(endpoint.protocol!=='https:'||endpoint.origin!==config.url.replace(/\/$/,''))throw unavailable();
  const signingKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',signingKey,new TextEncoder().encode(key));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const reply=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/rpc/check_auth_rate_limit',{
   method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
   body:JSON.stringify({server_token:config.secret,key_hash:hash}),signal:AbortSignal.timeout(5000),redirect:'error'
  });
  if(!reply.ok)throw unavailable();
  const allowed:unknown=await reply.json();
  if(typeof allowed!=='boolean')throw unavailable();
  return allowed;
 }catch{throw unavailable()}
}
