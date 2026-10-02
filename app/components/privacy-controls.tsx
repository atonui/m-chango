'use client';
import {useEffect,useState} from 'react';
import {apiJson} from '../lib/client/api';
export default function PrivacyControls(){
 const [research,setResearch]=useState(false),[marketing,setMarketing]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirmation,setConfirmation]=useState('');
 useEffect(()=>{let alive=true;void apiJson<{choices:{research:boolean;marketing:boolean};noticeReady:boolean}>('/api/account/privacy').then(r=>{if(alive){setResearch(r.choices.research);setMarketing(r.choices.marketing);setReady(r.noticeReady)}}).catch(e=>{if(alive)setMessage(e instanceof Error?e.message:'Unable to load.')});return()=>{alive=false}},[]);
 async function submit(action:string){setBusy(true);setMessage('');try{const result=await apiJson<{status?:string}>('/api/account/privacy',{method:'POST',body:JSON.stringify(action==='delete-request'?{action,confirmation}:{research,marketing})});setMessage(action==='delete-request'?`Deletion request status: ${result.status??'pending'}.`:'Choices saved.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}}
 return <section className="panel"><h1>Privacy and your data</h1><p>Research and marketing are optional and separate from using the ledger.</p>
 {!ready&&<p>Optional choices will become available when the privacy notice is ready.</p>}
 <label><input type="checkbox" disabled={busy||(!ready&&!research)} checked={research} onChange={e=>setResearch(e.target.checked)}/> Optional research</label>
 <label><input type="checkbox" disabled={busy||(!ready&&!marketing)} checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> Marketing messages</label>
 <button disabled={busy||(!ready&&(research||marketing))} onClick={()=>void submit('choices')}>Save choices</button><hr/>
 <a href="/api/account/privacy?action=export">Download account data</a><p>The export contains private information. Store it securely.</p><hr/>
 <h2>Request account deletion</h2><p>Deletion is processed automatically, normally within five minutes. It removes your fundraisers and private records and ends your sessions. Download your data first.</p>
 <label>Type REQUEST DELETION<input value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button disabled={busy||confirmation!=='REQUEST DELETION'} onClick={()=>void submit('delete-request')}>Submit deletion request</button>{message&&<p role="status">{message}</p>}
 </section>
}
