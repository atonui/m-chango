'use client';
import {useEffect,useRef,useState} from 'react';
import {apiJson} from '../lib/client/api';
import {type PublicFundraiser} from '../lib/domain/types';
import {formatKes} from '../lib/domain/money';
type Summary=Omit<PublicFundraiser,'entries'>&{recordVersion:number};
type Cursor={recordedAt:string;id:string}|null;
type Page={entries:PublicFundraiser['entries'];nextCursor:Cursor};
export default function AccountPublicLedger({publicId}:{publicId:string}){
 const [summary,setSummary]=useState<Summary|null>(null),[page,setPage]=useState<Page|null>(null),[error,setError]=useState('');
 const currentVersion=useRef<number|null>(null),requestGeneration=useRef(0);
 const path='/api/ledger/'+publicId;
 useEffect(()=>{
  let alive=true;setSummary(null);setPage(null);currentVersion.current=null;
  async function refresh(){const generation=++requestGeneration.current;try{
   const latest=await apiJson<Summary>(path);
   if(!alive||generation!==requestGeneration.current)return;
   if(latest.recordVersion!==currentVersion.current){
    setPage(null); // Remove potentially outdated names immediately on version change.
    const first=await apiJson<Page>(path+'/entries');
    if(!alive||generation!==requestGeneration.current)return;
    setPage(first);currentVersion.current=latest.recordVersion;
   }
   setSummary(latest);setError('');
  }catch(e){if(alive&&generation===requestGeneration.current){setPage(null);setError(e instanceof Error?e.message:'Unable to load progress.')}}}
  void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000);
  return()=>{alive=false;requestGeneration.current++;clearInterval(timer)};
 },[path]);
 async function next(cursor:Cursor){const generation=++requestGeneration.current;setError('');try{const result=await apiJson<Page>(path+'/entries?cursor='+encodeURIComponent(JSON.stringify(cursor)));if(generation===requestGeneration.current)setPage(result)}catch(e){if(generation===requestGeneration.current){setPage(null);setError(e instanceof Error?e.message:'Unable to load page.')}}}
 return <main className="shell"><header className="topbar"><a className="brand" href="/dashboard">M-Chango</a></header>{error&&<p role="alert" className="error">{error}</p>}
 {!summary?<p role="status">Loading fundraiser…</p>:<><h1 className="heading">{summary.title}</h1><p>{summary.purpose}</p><section className="panel"><h2>{formatKes(summary.totalMinor)} recorded</h2><p>{summary.entryCount} contributions · {summary.status==='closed'?'Closed':'Active'}</p>{summary.targetMinor!==null&&<p>Target {formatKes(summary.targetMinor)} · {summary.totalMinor>summary.targetMinor?'Surplus':'Remaining'} {formatKes(Math.abs(summary.targetMinor-summary.totalMinor))}</p>}<h3>M-Pesa: {summary.paymentNumber}</h3><p>Money goes directly to this number. Confirm the recipient before sending.</p>{summary.status==='closed'&&<p>This fundraiser is closed. Ask the organizer before sending money.</p>}</section>
 <section className="panel"><h2>Contributions</h2>{page?.entries.map(row=><p key={row.id}>{row.displayName} · {formatKes(row.amountMinor)}</p>)}{page?.entries.length===0&&<p>No contributions recorded.</p>}{page?.nextCursor&&<button onClick={()=>void next(page.nextCursor)}>Next page</button>}</section><p className="fine-print">Amounts are recorded by the organizer. M-Chango does not independently verify payments.</p></>}
 </main>
}
