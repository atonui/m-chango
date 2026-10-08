'use client';
import {useEffect,useState} from 'react';
import {apiJson,ApiError} from '../lib/client/api';
import {buildAdminOverviewModel,type AdminOverview} from '../lib/domain/admin';

export default function AdminOverviewPanel(){
 const [overview,setOverview]=useState<AdminOverview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{setOverview(await apiJson<AdminOverview>('/api/admin/overview'))}catch(e){setOverview(null);setError(e instanceof ApiError?e.message:'Unable to load admin overview.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 const model=overview?buildAdminOverviewModel(overview):null;
 return <section className="admin-content">
  <div className="dashboard-heading admin-heading"><div><span className="eyebrow">ADMIN</span><h1 className="heading">M-Chango control room</h1><p className="muted">A private view for release checks, data operations, and fundraiser health.</p></div><button className="secondary" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
  {loading&&<p className="notice" role="status">Loading admin overview...</p>}
  {error&&<div className="error" role="alert"><p>{error}</p><a className="secondary" href="/signin">Sign in</a><button className="secondary" onClick={()=>void load()} disabled={loading}>Try again</button></div>}
  {model&&<><div className="admin-release panel"><div><span className="eyebrow">ENVIRONMENT</span><strong>{model.release.label}</strong></div><div><span className="eyebrow">COMMIT</span><code>{model.release.commit}</code></div><div><span className="eyebrow">DEPLOYED</span><span>{model.release.deployed}</span></div><div><span className="eyebrow">ROLE</span><span>{model.role}</span></div></div>
  <div className="admin-stat-grid">{model.cards.map(card=><article key={card.label} className={'stat '+(card.tone==='main'?'main':'')+(card.tone==='attention'?' attention':'')}><small>{card.label}</small><strong>{card.value}</strong></article>)}</div>
  <section className="panel admin-next"><h2>Next admin sections</h2><p className="muted">This first pass is intentionally read-only. Fundraiser search, user lookup, privacy requests, analytics health, and audit logs will attach to the same guarded admin API boundary.</p><div className="admin-section-list"><span>Fundraisers</span><span>Users</span><span>Privacy requests</span><span>Analytics</span><span>Audit trail</span></div></section></>}
 </section>;
}
