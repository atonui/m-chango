'use client';
import {useCallback,useEffect,useState} from 'react';
import {type PrivateLedger,type ContributionRecord} from '../lib/domain/types';
import {apiJson} from '../lib/client/api';
import {formatKes,formatTime} from '../lib/domain/money';
import {toPublicFundraiser} from '../lib/domain/public-view';
import ContributionForm from './contribution-form';
import ImportReview from './import-review';
import SharePanel from './share-panel';
import AccountFundraiserForm from './account-fundraiser-form';
import ClosingSurvey from './closing-survey';
type Cursor={recordedAt:string;id:string}|null;
type LedgerPage=PrivateLedger&{nextCursor:Cursor};
export default function AccountLedger({publicId}:{publicId:string}){
 const path='/api/ledger/'+publicId+'/manage';
 const [page,setPage]=useState<LedgerPage|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState<'add'|'import'|'settings'|null>(null),[entry,setEntry]=useState<ContributionRecord>(),[snapshot,setSnapshot]=useState<PrivateLedger|null>(null);
 const load=useCallback(async(cursor:Cursor=null)=>{setBusy(true);setError('');setSnapshot(null);try{
  setPage(await apiJson<LedgerPage>(path+(cursor?'?cursor='+encodeURIComponent(JSON.stringify(cursor)):'')));
 }catch(e){setPage(null);setError(e instanceof Error?e.message:'Unable to load.')}finally{setBusy(false)}},[path]);
 useEffect(()=>{setPage(null);setMode(null);setEntry(undefined);void load()},[load]);
 async function done(){setMode(null);setEntry(undefined);await load()}
 async function change(row:ContributionRecord){if(!page)return;setBusy(true);setSnapshot(null);try{
  await apiJson(path+'/contributions/'+row.id,{method:'PATCH',body:JSON.stringify({action:row.removedAt?'restore':'remove',expectedVersion:page.fundraiser.recordVersion})});await load();
 }catch(e){setError(e instanceof Error?e.message:'Unable to update.')}finally{setBusy(false)}}
 async function share(){setBusy(true);setError('');try{setSnapshot(await apiJson<PrivateLedger>(path+'/snapshot'))}catch(e){setError(e instanceof Error?e.message:'Unable to prepare the complete list.')}finally{setBusy(false)}}
 return <main className="shell"><header className="topbar"><a className="brand" href="/dashboard">M-Chango</a><a href="/dashboard">My fundraisers</a></header>
  {error&&<p className="error" role="alert">{error}</p>}
  {!page&&<section className="panel"><h1>Your contribution ledger</h1><p>{busy?'Loading…':'Sign in to open your fundraiser.'}</p><button disabled={busy} onClick={()=>void load()}>Try again</button></section>}
  {page&&<><h1 className="heading">{page.fundraiser.title}</h1><p>{page.fundraiser.purpose}</p><section className="panel"><h2>{formatKes(page.totalMinor)} recorded</h2><p>{page.entryCount} active contributions · {page.fundraiser.status==='closed'?'Closed':'Active'}</p>
   <div className="actions"><button disabled={busy||page.fundraiser.status==='closed'} onClick={()=>{setEntry(undefined);setMode('add')}}>Record contribution</button><button disabled={busy||page.fundraiser.status==='closed'} onClick={()=>setMode('import')}>Import list</button><button disabled={busy} onClick={()=>void share()}>Prepare complete WhatsApp list</button><a href={path+'/export'}>Download CSV</a></div>
  </section>
  <button disabled={busy} onClick={()=>setMode('settings')}>Fundraiser settings</button>
  {page.fundraiser.status==='closed'&&<ClosingSurvey path={path}/>}
  {mode&&<section className="panel"><button onClick={()=>{setMode(null);setEntry(undefined)}}>Close form</button>{mode==='settings'?<AccountFundraiserForm key={page.fundraiser.recordVersion} fundraiser={page.fundraiser} onSaved={done}/>:mode==='add'?<ContributionForm key={entry?.id??'new'} path={path} version={page.fundraiser.recordVersion} entry={entry} onDone={done} onRefresh={()=>load()}/>:<ImportReview path={path} version={page.fundraiser.recordVersion} onDone={done} onRefresh={()=>load()}/>}</section>}
  {snapshot&&<SharePanel view={toPublicFundraiser(snapshot)} publicPath={'/fundraisers/'+publicId}/>}
  <section className="panel"><h2>Ledger entries</h2><p className="fine-print">Organizer-recorded contributions. M-Chango does not independently verify payments.</p>
   {page.entries.length===0&&<p>No entries on this page.</p>}
   {page.entries.map(row=><article key={row.id}><h3>{row.displayName} · {formatKes(row.amountMinor)}</h3><p>{row.removedAt?'Removed · ':''}{formatTime(row.recordedAt)}</p><div className="actions"><button disabled={busy} onClick={()=>{setEntry(row);setMode('add')}}>Correct</button><button disabled={busy} onClick={()=>void change(row)}>{row.removedAt?'Restore':'Remove'}</button></div></article>)}
   <div className="actions"><button disabled={busy} onClick={()=>void load()}>First page / refresh</button>{page.nextCursor&&<button disabled={busy} onClick={()=>void load(page.nextCursor)}>Next page</button>}</div>
  </section></>}
 </main>
}
