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
 return <section className="panel"><span className="eyebrow">WELCOME TO M-CHANGO</span><h1 className="heading">Your group. Your ledger.</h1><p>Manage your fundraisers with Google or an email code.</p>
 <button className="auth-google" disabled={busy||!options.google} onClick={()=>void action('google')}><svg className="google-mark" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.92a6 6 0 0 1 0-3.84v-2.6H3.07a10 10 0 0 0 0 9.04l3.35-2.6Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.35 2.6C7.2 7.72 9.4 5.96 12 5.96Z"/></svg><span>Continue with Google</span></button>
 <form onSubmit={e=>{e.preventDefault();void action(sent?'verify':'email')}}><label>Email address<input type="email" autoComplete="email" required disabled={busy||sent||!options.email} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 {sent&&<label>One-time code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" required value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>}
 <button className="secondary" disabled={busy||!options.email}>{sent?'Verify and sign in':'Send email code'}</button></form>
 {sent&&<><button disabled={busy||cooldown>0} onClick={()=>void action('email')}>{cooldown?`Resend in ${cooldown}s`:'Resend code'}</button><button disabled={busy} onClick={()=>{setSent(false);setCode('')}}>Use another email</button></>}
 {!options.google&&!options.email&&<p>Sign-in is awaiting configuration.</p>}{message&&<p role="status">{message}</p>}<p className="field-note">New here? <a href="/how-it-works">See how M-Chango works →</a></p><p className="field-note"><a href="/privacy">Privacy policy</a></p><a className="muted" href="/">← Back to M-Chango</a></section>
}
