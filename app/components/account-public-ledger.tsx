'use client';
import {useEffect,useRef,useState} from 'react';
import {apiJson} from '../lib/client/api';
import {type PublicFundraiser} from '../lib/domain/types';
import {formatKes} from '../lib/domain/money';
import {targetSummary} from '../lib/domain/public-view';
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
 const target=summary?targetSummary(summary.totalMinor,summary.targetMinor):null;
 return <main className="shell public-ledger"><header className="topbar"><a className="brand" href="/dashboard"><span className="brand-mark">m</span>M-Chango</a></header>{error&&<p role="alert" className="error">{error}</p>}
 {!summary?<p role="status">Loading fundraiser…</p>:<><span className={'badge '+(summary.status==='closed'?'closed':'')}>{summary.status==='closed'?'Closed':'Active fundraiser'}</span><h1 className="heading">{summary.title}</h1>{summary.purpose&&<p className="public-purpose">{summary.purpose}</p>}<section className="stats public-stats" aria-label="Fundraiser progress"><div className="stat main"><small>Total recorded</small><strong>{formatKes(summary.totalMinor)}</strong>{summary.targetMinor!==null&&<><small>{target?.progress}% of {formatKes(summary.targetMinor)}</small><progress className="fundraiser-progress" aria-label="Fundraiser progress" max={100} value={target?.progress??0}/></>}</div><div className="stat"><small>Contributions</small><strong>{summary.entryCount}</strong></div><div className="stat"><small>{target?.label}</small><strong>{target?.value}</strong></div></section>
 <div className="split public-split"><section className="panel payment-panel"><span className="eyebrow">PAY DIRECTLY TO</span><h2>M-Pesa</h2><p className="pay-number">{summary.paymentNumber}</p><p className="muted">Money goes directly to this number. Confirm the recipient before sending.</p>{summary.status==='closed'&&<p className="notice">This fundraiser is closed. Ask the organizer before sending money.</p>}</section>
 <section className="panel"><div className="panel-heading"><h2 className="section-title">Contributions</h2><span className="entry-meta">Latest entries</span></div><div className="public-contribution-list">{page?.entries.map(row=><p key={row.id}><span>{row.displayName}</span><strong>{formatKes(row.amountMinor)}</strong></p>)}</div>{page?.entries.length===0&&<p>No contributions recorded.</p>}{page?.nextCursor&&<button className="secondary small" onClick={()=>void next(page.nextCursor)}>Load more</button>}</section></div><p className="fine-print">Amounts are recorded by the organizer. M-Chango does not independently verify payments.</p></>}
 </main>
}
