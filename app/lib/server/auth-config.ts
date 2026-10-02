import {env} from 'cloudflare:workers';
import {DomainError} from '../domain/types';
import type {AuthConfig} from './auth-handler';
export function authConfig():AuthConfig{
 const b=env as unknown as {SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;APP_ORIGIN?:string;GOOGLE_AUTH_READY?:string;EMAIL_AUTH_READY?:string;AUTH_CLIENT_IP?:(request:Request)=>string|null;AUTH_RATE_LIMIT?:{limit:(input:{key:string})=>Promise<{success:boolean}>}};
 if(!b.SUPABASE_URL||!b.SUPABASE_PUBLISHABLE_KEY||!b.APP_ORIGIN)throw new DomainError('Sign-in is not configured yet.',503);
 const origin=new URL(b.APP_ORIGIN);if(origin.protocol!=='https:'||origin.origin!==b.APP_ORIGIN)throw new DomainError('Sign-in address is not configured.',503);
 return {url:b.SUPABASE_URL,publishableKey:b.SUPABASE_PUBLISHABLE_KEY,origin:b.APP_ORIGIN,googleReady:b.GOOGLE_AUTH_READY==='1',emailReady:b.EMAIL_AUTH_READY==='1',clientIp:b.AUTH_CLIENT_IP,rateLimit:b.AUTH_RATE_LIMIT?async key=>(await b.AUTH_RATE_LIMIT!.limit({key})).success:undefined};
}
