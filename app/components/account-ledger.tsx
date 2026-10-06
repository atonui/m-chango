'use client';
import {useCallback,useEffect,useState} from 'react';
import {type PrivateLedger,type ContributionRecord} from '../lib/domain/types';
import {apiJson} from '../lib/client/api';
import {formatKes,formatTime} from '../lib/domain/money';
import {targetSummary,toPublicFundraiser} from '../lib/domain/public-view';
import {privateLedgerEntryVisibility} from '../lib/domain/private-ledger-copy';
import ContributionForm from './contribution-form';
import ImportReview from './import-review';
import SharePanel from './share-panel';
import AccountFundraiserForm from './account-fundraiser-form';
import ClosingSurvey from './closing-survey';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
type Cursor={recordedAt:string;id:string}|null;
type LedgerPage=PrivateLedger&{nextCursor:Cursor};
export default function AccountLedger({publicId}:{publicId:string}){
 const path='/api/ledger/'+publicId+'/manage';
 const [page,setPage]=useState<LedgerPage|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState<'add'|'import'|'settings'|null>(null),[entry,setEntry]=useState<ContributionRecord>(),[snapshot,setSnapshot]=useState<PrivateLedger|null>(null);
 const [remove,setRemove]=useState<ContributionRecord|null>(null);
 const load=useCallback(async(cursor:Cursor=null)=>{setBusy(true);setError('');setSnapshot(null);try{
  setPage(await apiJson<LedgerPage>(path+(cursor?'?cursor='+encodeURIComponent(JSON.stringify(cursor)):'')));
 }catch(e){setPage(null);setError(e instanceof Error?e.message:'Unable to load.')}finally{setBusy(false)}},[path]);
 useEffect(()=>{setPage(null);setMode(null);setEntry(undefined);void load()},[load]);
 async function done(){setMode(null);setEntry(undefined);await load()}
 async function change(row:ContributionRecord){if(!page)return;setBusy(true);setSnapshot(null);try{
  await apiJson(path+'/contributions/'+row.id,{method:'PATCH',body:JSON.stringify({action:row.removedAt?'restore':'remove',expectedVersion:page.fundraiser.recordVersion})});await load();
 }catch(e){setError(e instanceof Error?e.message:'Unable to update.')}finally{setBusy(false)}}
 async function share(){setBusy(true);setError('');try{setSnapshot(await apiJson<PrivateLedger>(path+'/snapshot'))}catch(e){setError(e instanceof Error?e.message:'Unable to prepare the complete list.')}finally{setBusy(false)}}
 const target=page?targetSummary(page.totalMinor,page.fundraiser.targetMinor):null;
 return <main className="shell"><header className="topbar"><a className="brand" href="/dashboard"><span className="brand-mark">m</span>M-Chango</a><a className="secondary" href="/dashboard">← My fundraisers</a></header>
  {error&&<p className="error" role="alert">{error}</p>}
  {!page&&<section className="panel"><h1 className="section-title">Your contribution ledger</h1><p role="status">{busy?'Opening your ledger…':'Unable to open your fundraiser.'}</p><button className="secondary" disabled={busy} onClick={()=>void load()}>Try again</button></section>}
  {page&&<><span className={'badge '+(page.fundraiser.status==='closed'?'closed':'')}>{page.fundraiser.status==='closed'?'Closed':'Collecting contributions'}</span><h1 className="heading">{page.fundraiser.title}</h1><p className="public-purpose">{page.fundraiser.purpose||'Every contribution brings us closer.'}</p>
   <div className="actions ledger-actions"><button className="primary" disabled={busy||page.fundraiser.status==='closed'} onClick={()=>{setEntry(undefined);setMode('add')}}>+ Add contribution</button><button className="secondary" disabled={busy||page.fundraiser.status==='closed'} onClick={()=>setMode('import')}>Paste a list or receipt</button><a className="secondary" href={'/fundraisers/'+publicId}>View shared page ↗</a></div>
   <section className="stats" aria-label="Fundraiser totals"><div className="stat main"><small>Total recorded</small><strong>{formatKes(page.totalMinor)}</strong>{page.fundraiser.targetMinor!==null&&<><small>{target?.progress}% of {formatKes(page.fundraiser.targetMinor)}</small><progress className="fundraiser-progress" aria-label="Fundraiser progress" max={100} value={target?.progress??0}/></>}</div><div className="stat"><small>Contributions</small><strong>{page.entryCount}</strong><span className="entry-meta">Including repeat contributors</span></div><div className="stat"><small>{target?.label}</small><strong>{target?.value}</strong></div></section>
   <div className="split"><section className="panel"><div className="panel-heading"><h2 className="section-title">Contributions</h2><a className="secondary small" href={path+'/export'}>Export CSV ↓</a></div>
    {page.entries.length===0&&<div className="empty-state"><h3>Your first contribution starts here.</h3><p>Add money you have received, or bring in your existing WhatsApp list.</p><div className="actions empty-actions"><button className="primary" disabled={busy||page.fundraiser.status==='closed'} onClick={()=>{setEntry(undefined);setMode('add')}}>+ Add first contribution</button><button className="secondary" disabled={busy||page.fundraiser.status==='closed'} onClick={()=>setMode('import')}>Paste existing list</button></div><a className="muted" href="/how-it-works">Need a hand? Read the quick guide →</a></div>}
    <div className="contribution-list">{page.entries.map(row=><article key={row.id} className={'contribution-card '+(row.removedAt?'removed-entry':'')}><div className="contribution-info"><h3>{row.displayName}</h3><p className="entry-meta">{row.removedAt?'Removed · ':''}{formatTime(row.receivedAt??row.recordedAt)}</p><p className="entry-meta">{privateLedgerEntryVisibility(page.fundraiser.publicNamesEnabled,row.hideName)}</p></div><strong className="amount">{formatKes(row.amountMinor)}</strong><div className="actions contribution-controls"><button className="secondary small" aria-label={'Edit '+row.displayName} disabled={busy} onClick={()=>{setEntry(row);setMode('add')}}>Edit</button><button className={'secondary small '+(row.removedAt?'':'danger')} aria-label={(row.removedAt?'Restore ':'Remove ')+row.displayName} disabled={busy} onClick={()=>row.removedAt?void change(row):setRemove(row)}>{row.removedAt?'Restore':'Remove'}</button></div></article>)}</div>
    <div className="actions ledger-pagination"><button className="secondary small" disabled={busy} onClick={()=>void load()}>Refresh</button>{page.nextCursor&&<button className="secondary small" disabled={busy} onClick={()=>void load(page.nextCursor)}>Load more</button>}</div><p className="fine-print">Amounts are recorded by you. M-Chango does not independently verify payments.</p>
   </section><aside className="stack"><section className="panel"><span className="eyebrow">KEEP EVERYONE IN THE LOOP</span><h2>Share on WhatsApp</h2><p className="muted">Copy contributors, amounts, total and balance straight into your group.</p><button className="primary" disabled={busy} onClick={()=>void share()}>{busy?'Please wait…':snapshot?'Refresh complete list':'Prepare WhatsApp list'}</button><p className="field-note">Includes every page. Contributor names follow your privacy settings.</p></section>{snapshot&&<SharePanel view={toPublicFundraiser(snapshot)} publicPath={'/fundraisers/'+publicId}/>}
    <section className="panel"><span className="eyebrow">PAYMENTS GO DIRECTLY TO</span><p className="pay-number">{page.fundraiser.paymentNumber}</p><p className="muted">This M-Pesa number appears on your shared page.</p><button className="secondary" disabled={busy} onClick={()=>setMode('settings')}>Fundraiser settings</button></section>{page.fundraiser.status==='closed'&&<ClosingSurvey path={path}/>}</aside></div>
   <Dialog open={mode!==null} onOpenChange={open=>{if(!open){setMode(null);setEntry(undefined)}}}><DialogContent className="dialog-scroll"><DialogTitle>{mode==='settings'?'Fundraiser settings':mode==='import'?'Import contributions':entry?'Correct contribution':'Add contribution'}</DialogTitle><DialogDescription>Review your details before saving. Confirmed contributions update your shared page.</DialogDescription>{mode==='settings'?<AccountFundraiserForm key={page.fundraiser.recordVersion} fundraiser={page.fundraiser} onSaved={done}/>:mode==='add'?<ContributionForm key={entry?.id??'new'} path={path} version={page.fundraiser.recordVersion} entry={entry} onDone={done} onRefresh={()=>load()}/>:mode==='import'?<ImportReview path={path} version={page.fundraiser.recordVersion} onDone={done} onRefresh={()=>load()}/>:null}</DialogContent></Dialog>
   <AlertDialog open={!!remove} onOpenChange={open=>{if(!open)setRemove(null)}}><AlertDialogContent><AlertDialogTitle>Remove this contribution?</AlertDialogTitle><AlertDialogDescription className="wrap-anywhere">{remove?.displayName} · {remove?formatKes(remove.amountMinor):''}. It will leave the total and shared page. You can restore it later.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Keep entry</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>{if(remove)void change(remove);setRemove(null)}}>Remove entry</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>}
  <footer className="site-footer"><span>M-Chango · Your group, one clear ledger.</span><a href="/dashboard/privacy">Privacy and your data</a></footer>
 </main>
}
