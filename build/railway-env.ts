import {checkRailwayLimit,railwayClientIp} from '../app/lib/server/railway-throttle';
/** Runtime-only Node configuration. Credentials never enter client bundles. */
const configuration=process.env;
export const env={...configuration,
 AUTH_CLIENT_IP:(req:Request)=>railwayClientIp(req,configuration.RAILWAY_INGRESS_VERIFIED==='1'),
 AUTH_RATE_LIMIT:configuration.AUTH_THROTTLE_SECRET&&configuration.SUPABASE_URL&&configuration.SUPABASE_PUBLISHABLE_KEY?{
  limit:async({key}:{key:string})=>({success:await checkRailwayLimit({
   url:configuration.SUPABASE_URL!,publishableKey:configuration.SUPABASE_PUBLISHABLE_KEY!,secret:configuration.AUTH_THROTTLE_SECRET!
  },key)})
 }:undefined
} as unknown as Cloudflare.Env;
