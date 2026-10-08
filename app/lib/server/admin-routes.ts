import {DomainError} from '../domain/types';
import {adminRpc} from './admin';
import {boundary,response} from './http';

interface AdminRouteBindings{url?:string;publishableKey?:string}

export function handleAdminOverview(req:Request,bindings:AdminRouteBindings){
 return boundary(async()=>{
  if(!bindings.url||!bindings.publishableKey)throw new DomainError('Admin is not configured.',503);
  return response(await adminRpc(req,'admin_overview',{}, {url:bindings.url,publishableKey:bindings.publishableKey}));
 });
}
