/** Token extraction only. Supabase validates identity; these values never prove ownership. */
export function requestAccessToken(req:Request):string|undefined{
 const authorization=req.headers.get('Authorization');
 if(authorization!==null){
  const match=/^Bearer ([A-Za-z0-9._~-]{1,8192})$/.exec(authorization);
  return match?.[1];
 }
 const matches=(req.headers.get('Cookie')??'').split(';').map(part=>part.trim()).filter(part=>part.startsWith('__Host-m_chango_access_token='));
 if(matches.length!==1)return undefined;
 const value=matches[0].slice('__Host-m_chango_access_token='.length);
 return /^[A-Za-z0-9._~-]{1,8192}$/.test(value)?value:undefined;
}
