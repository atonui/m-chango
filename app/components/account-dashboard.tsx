'use client';
import {useEffect,useState} from 'react';
import {apiJson,ApiError} from '../lib/client/api';
import {formatKes} from '../lib/domain/money';
type Fundraiser={id:string;publicId:string;title:string;status:'active'|'closed';totalMinor:number;targetMinor:number|null;updatedAt:string};
type Page={fundraisers:Fundraiser[];nextCursor:{updatedAt:string;id:string}|null};
export default function AccountDashboard(){
 const [page,setPage]=useState<Page|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(cursor:Page['nextCursor']=null){setLoading(true);setError('');try{
  const result=await apiJson<Page>('/api/account/fundraisers'+(cursor?'?cursor='+encodeURIComponent(JSON.stringify(cursor)):''));
  setPage(result);
 }catch(e){setPage(null);setError(e instanceof ApiError?e.message:'Unable to load your fundraisers.');}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 return <section className="dashboard-content">
  <div className="dashboard-heading"><div><span className="eyebrow">YOUR GROUP, ONE CLEAR LEDGER</span><h1 className="heading">My fundraisers</h1><p className="muted">Keep every contribution in view, and keep everyone in the loop.</p></div><a className="primary" href="/dashboard/new">+ Create fundraiser</a></div>
  {loading&&<p className="notice" role="status">Loading your fundraisers…</p>}
  {error&&<div className="error" role="alert"><p>{error}</p><button className="secondary" onClick={()=>void load()} disabled={loading}>Try again</button></div>}
  {!loading&&page?.fundraisers.length===0&&<section className="panel empty-state"><h2>Start your first fundraiser</h2><p>Add a purpose and your M-Pesa number. Then record contributions and share updates with your group.</p><a className="primary" href="/dashboard/new">Create fundraiser</a></section>}
  <div className="fundraiser-grid">{page?.fundraisers.map(f=><article key={f.id} className="panel fundraiser-card"><span className={'badge '+(f.status==='closed'?'closed':'')}>{f.status==='closed'?'Closed':'Collecting contributions'}</span><h2><a href={'/dashboard/'+f.publicId}>{f.title}</a></h2><span className="entry-meta">Total recorded</span><strong className="card-total">{formatKes(f.totalMinor)}</strong>{f.targetMinor!==null&&<p className="muted">Target {formatKes(f.targetMinor)}</p>}<div className="card-footer"><span className="entry-meta">Updated {new Date(f.updatedAt).toLocaleDateString()}</span><a className="secondary" href={'/dashboard/'+f.publicId}>Open ledger →</a></div></article>)}</div>
  <div className="actions dashboard-footer">{page?.nextCursor&&<button className="secondary" disabled={loading} onClick={()=>void load(page.nextCursor)}>Next page →</button>}{page&&<button className="secondary" disabled={loading} onClick={()=>void load()}>Refresh</button>}<a className="muted" href="/dashboard/privacy">Privacy and your data</a></div>
 </section>
}
