import handler from 'vinext/server/fetch-handler';
export default {
 fetch(req:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const path=new URL(req.url).pathname;
  if(/^\/(?:api\/fundraisers|manage|f)(?:\/|$)/.test(path))return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  return handler.fetch(req,env,ctx);
 }
};
