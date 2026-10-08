import {DomainError} from '../domain/types';
import {requestAccessToken} from './account-session';
import {SupabaseRpc,type SupabaseConfig} from './supabase-rpc';

type AdminBindings=SupabaseConfig;

export async function requireAdminRequest(req:Request){
 const token=requestAccessToken(req);
 if(!token)throw new DomainError('Admin access required.',403);
 return {token};
}

export async function adminRpc(req:Request,rpcName:string,payload:Record<string,unknown>={},bindings?:AdminBindings):Promise<unknown>{
 const {token}=await requireAdminRequest(req);
 if(!bindings?.url||!bindings.publishableKey)throw new DomainError('Admin is not configured.',503);
 const rpc=new SupabaseRpc(bindings,token);
 try{
  return await rpc.call(rpcName,payload);
 }catch(error){
  if(error instanceof DomainError&&(error.status===401||error.status===403))throw new DomainError('Admin access required.',403);
  throw error;
 }
}
