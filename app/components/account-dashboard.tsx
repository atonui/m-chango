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
 return <section className="panel"><div className="section-heading"><h1>My fundraisers</h1></div>
  <p>Manage your fundraisers and keep every contribution in view.</p><a className="primary" href="/dashboard/new">Create fundraiser</a> <a href="/dashboard/privacy">Privacy and your data</a>
  {loading&&<p role="status">Loading your fundraisers…</p>}
  {error&&<div role="alert"><p>{error}</p><button onClick={()=>void load()} disabled={loading}>Try again</button></div>}
  {!loading&&page?.fundraisers.length===0&&<p>You have no fundraisers yet.</p>}
  {page?.fundraisers.map(f=><article key={f.id} className="panel"><h2>{f.title}</h2><p>{f.status==='closed'?'Closed':'Active'} · {formatKes(f.totalMinor)} recorded{f.targetMinor!==null?' · Target '+formatKes(f.targetMinor):''}</p><p>Updated {new Date(f.updatedAt).toLocaleDateString()}</p><a href={'/dashboard/'+f.publicId}>Manage fundraiser</a></article>)}
  {page?.nextCursor&&<button disabled={loading} onClick={()=>void load(page.nextCursor)}>Next page</button>}
  {page&&<button disabled={loading} onClick={()=>void load()}>Refresh</button>}
 </section>
}
