'use client';
import {useEffect,useState} from 'react';
import {apiJson} from '../lib/client/api';
export default function SignIn(){
 const [options,setOptions]=useState({google:false,email:false}),[email,setEmail]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{let alive=true;void apiJson<{google:boolean;email:boolean}>('/api/auth/options').then(r=>{if(alive)setOptions(r)}).catch(e=>{if(alive)setMessage(e.message)});if(new URLSearchParams(window.location.search).has('error'))setMessage('Sign-in expired. Please try again.');return()=>{alive=false}},[]);
 useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(cooldown-1),1000);return()=>clearTimeout(t)},[cooldown]);
 async function action(name:string){setBusy(true);setMessage('');try{
  if(name==='google'){const r=await apiJson<{url:string}>('/api/auth/google',{method:'POST',body:JSON.stringify({returnTo:'/dashboard'})});window.location.assign(r.url);return}
  if(name==='email'){await apiJson('/api/auth/email',{method:'POST',body:JSON.stringify({email})});setSent(true);setCooldown(60);setMessage('Check your email for a one-time code.')}
  if(name==='verify'){await apiJson('/api/auth/verify',{method:'POST',body:JSON.stringify({code})});new BroadcastChannel('m-chango-auth').postMessage('changed');window.location.assign('/dashboard')}
 }catch(e){setMessage(e instanceof Error?e.message:'Unable to sign in.')}finally{setBusy(false)}}
 return <section className="panel"><h1>Sign in to M-Chango</h1><p>Manage your fundraisers with Google or an email code.</p>
 <button disabled={busy||!options.google} onClick={()=>void action('google')}>Continue with Google</button>
 <form onSubmit={e=>{e.preventDefault();void action(sent?'verify':'email')}}><label>Email address<input type="email" autoComplete="email" required disabled={busy||sent||!options.email} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 {sent&&<label>One-time code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>}
 <button disabled={busy||!options.email}>{sent?'Verify and sign in':'Send email code'}</button></form>
 {sent&&<><button disabled={busy||cooldown>0} onClick={()=>void action('email')}>{cooldown?`Resend in ${cooldown}s`:'Resend code'}</button><button disabled={busy} onClick={()=>{setSent(false);setCode('')}}>Use another email</button></>}
 {!options.google&&!options.email&&<p>Sign-in is awaiting configuration.</p>}{message&&<p role="status">{message}</p>}<a href="/">Back to M-Chango</a></section>
}
