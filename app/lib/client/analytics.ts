'use client';
type PublicEvent='contribution_list_copied'|'public_fundraiser_viewed';
async function trackPublicEvent(publicId:string,name:PublicEvent):Promise<void>{
 try{
  await fetch('/api/ledger/'+encodeURIComponent(publicId)+'/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name}),keepalive:true});
 }catch{}
}
export const trackContributionListCopied=(publicId:string)=>trackPublicEvent(publicId,'contribution_list_copied');
export const trackPublicFundraiserViewed=(publicId:string)=>trackPublicEvent(publicId,'public_fundraiser_viewed');
