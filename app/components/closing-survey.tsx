'use client';
import {useState} from 'react';
import {apiJson} from '../lib/client/api';
export default function ClosingSurvey({path}:{path:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 return <section className="panel"><h2>How did the fundraiser go?</h2><p>Optional. Your response is private and helps us understand fundraising outcomes. Please leave names, medical details and other personal information out of your feedback.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');const values=Object.fromEntries(new FormData(e.currentTarget));try{await apiJson(path+'/survey',{method:'POST',body:JSON.stringify(values)});setMessage('Thank you. Your response was saved.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to save.')}finally{setBusy(false)}}}>
 <label>Outcome<select name="outcome"><option value="prefer_not_to_say">Prefer not to say</option><option value="achieved">Achieved the purpose</option><option value="partly_achieved">Partly achieved the purpose</option><option value="not_achieved">Did not achieve the purpose</option></select></label>
 <label>Feedback <span className="optional">Optional</span><textarea name="feedback" maxLength={2000}/></label><button disabled={busy}>{busy?'Saving…':'Save response'}</button>{message&&<p role="status">{message}</p>}
 </form></section>
}
