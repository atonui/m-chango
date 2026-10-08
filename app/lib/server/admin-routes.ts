import {DomainError} from '../domain/types';
import {adminRpc} from './admin';
import {boundary,response} from './http';

interface AdminRouteBindings{url?:string;publishableKey?:string}
function config(bindings:AdminRouteBindings){
 if(!bindings.url||!bindings.publishableKey)throw new DomainError('Admin is not configured.',503);
 return {url:bindings.url,publishableKey:bindings.publishableKey};
}
function listPayload(req:Request){
 const url=new URL(req.url),limit=Number(url.searchParams.get('limit')??25);
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new DomainError('Choose a page size from 1 to 50.',422);
 let cursor:unknown=null;
 if(url.searchParams.has('cursor'))try{cursor=JSON.parse(url.searchParams.get('cursor')!)}catch{throw new DomainError('Invalid page cursor.',422)}
 const search=url.searchParams.get('q')?.trim()||null;
 return {page_cursor:cursor,page_size:limit,search};
}

export function handleAdminOverview(req:Request,bindings:AdminRouteBindings){
 return boundary(async()=>{
  return response(await adminRpc(req,'admin_overview',{}, config(bindings)));
 });
}

export function handleAdminFundraisers(req:Request,bindings:AdminRouteBindings){
 return boundary(async()=>{
  return response(await adminRpc(req,'admin_fundraisers',listPayload(req),config(bindings)));
 });
}

export function handleAdminUsers(req:Request,bindings:AdminRouteBindings){
 return boundary(async()=>{
  return response(await adminRpc(req,'admin_users',listPayload(req),config(bindings)));
 });
}
