'use client';
import {useState} from 'react';
import {type PublicFundraiser} from '../lib/domain/types';
import {whatsAppSummary,whatsAppContributorList} from '../lib/domain/summary';
import {sharePublicSummary} from '../lib/client/api';

export default function SharePanel({view,publicPath='/f/'+view.publicId}:{view:PublicFundraiser;publicPath?:string}){
 const [notice,setNotice]=useState(''),[summaryNotice,setSummaryNotice]=useState('');
 const link=typeof window==='undefined'?publicPath:location.origin+publicPath;
 const summary=whatsAppSummary(view,link),list=whatsAppContributorList(view);
 return <section className="panel">
  <span className="eyebrow">KEEP EVERYONE IN THE LOOP</span>
  <h2>Share the contributions</h2>
  <p className="muted">Copy the full list and paste it straight into WhatsApp.</p>
  <textarea aria-label="Contribution list for WhatsApp" className="share-copy" readOnly rows={8} value={list} onFocus={e=>e.target.select()}/>
  <button className="primary" onClick={async()=>{
   const result=await sharePublicSummary(list,{clipboard:navigator.clipboard});
   setNotice(result.copied?'List copied. Paste it into WhatsApp.':'Select the list above and copy it manually.');
  }}>Copy contribution list</button>
  {notice&&<p role="status" className="field-note">{notice}</p>}
  <p className="field-note">Names follow your visibility settings. Hidden contributors appear as Anonymous. Amounts are recorded by the organizer.</p>
  <details>
   <summary className="muted">Share a short update with a link</summary>
   <textarea aria-label="Public summary for manual copying" className="share-copy" readOnly rows={4} value={summary} onFocus={e=>e.target.select()}/>
   <button className="secondary" onClick={async()=>{
    const result=await sharePublicSummary(summary);
    setSummaryNotice(result.cancelled?'Sharing cancelled.':result.copied?'Shared or copied. Paste into your group.':'Select the summary above and copy it manually.');
   }}>Share short update ↗</button>
   {summaryNotice&&<p role="status" className="field-note">{summaryNotice}</p>}
  </details>
 </section>;
}
