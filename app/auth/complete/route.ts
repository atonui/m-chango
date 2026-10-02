import {handleAuth} from '../../lib/server/auth-handler';
import {authConfig} from '../../lib/server/auth-config';
import {boundary} from '../../lib/server/http';
export const dynamic='force-dynamic';
export function GET(req:Request){return boundary(async()=>handleAuth(req,authConfig(),'complete'))}
