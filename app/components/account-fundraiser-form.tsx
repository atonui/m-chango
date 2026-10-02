'use client';
import {useState} from 'react';
import {apiJson} from '../lib/client/api';
import {type FundraiserRecord} from '../lib/domain/types';
export default function AccountFundraiserForm({fundraiser,onSaved}:{fundraiser?:FundraiserRecord;onSaved?:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const fields=Object.fromEntries(new FormData(e.currentTarget));try{
  if(fundraiser){await apiJson('/api/ledger/'+fundraiser.publicId+'/manage',{method:'PATCH',body:JSON.stringify({...fundraiser,...fields,publicNamesEnabled:fields.publicNamesEnabled==='on',expectedVersion:fundraiser.recordVersion})});await onSaved?.()}
  else{const created=await apiJson<{publicId:string}>('/api/ledger',{method:'POST',body:JSON.stringify({...fields,publicNamesEnabled:fields.publicNamesEnabled==='on'})});location.assign('/dashboard/'+created.publicId)}
 }catch(e){setError(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}}
 return <section className="panel"><h2>{fundraiser?'Fundraiser settings':'Create a fundraiser'}</h2><form onSubmit={save}>
 <label>Fundraiser name<input placeholder="e.g. A new roof for Mum" name="title" defaultValue={fundraiser?.title} required minLength={3} maxLength={120}/></label>
 <label>Purpose <span className="optional">Optional</span><textarea placeholder="Tell your group what you are raising money for." name="purpose" defaultValue={fundraiser?.purpose} maxLength={2000}/></label>
 <label>Public M-Pesa number<input placeholder="e.g. 0712 345 678" name="paymentNumber" defaultValue={fundraiser?.paymentNumber} required inputMode="tel"/></label>
 <label>Target (KSh) <span className="optional">Optional</span><input name="target" defaultValue={fundraiser?.targetMinor?String(fundraiser.targetMinor/100):''} inputMode="decimal"/></label>
 <label className="check-label"><input type="checkbox" name="publicNamesEnabled" defaultChecked={fundraiser?.publicNamesEnabled??false}/> Show contributor names publicly</label><p className="field-note">Names are hidden by default. Enable this only when contributors are comfortable being named. Entries marked Hide name remain anonymous.</p>
 {fundraiser&&<label>Status<select name="status" defaultValue={fundraiser.status}><option value="active">Active</option><option value="closed">Closed</option></select></label>}
 <button className="primary" disabled={busy}>{busy?'Saving…':fundraiser?'Save settings':'Create fundraiser'}</button>
 {error&&<p className="error" role="alert">{error}</p>}</form><p className="fine-print">Money goes directly to the organizer. M-Chango does not process payments.</p></section>
}
