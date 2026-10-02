import {handleAuth} from '../../../lib/server/auth-handler';
import {authConfig} from '../../../lib/server/auth-config';
import {boundary} from '../../../lib/server/http';
export const dynamic='force-dynamic';
function handle(req:Request,context:{params:Promise<{action:string}>}){return boundary(async()=>handleAuth(req,authConfig(),(await context.params).action))}
export const GET=handle;export const POST=handle;
