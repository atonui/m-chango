'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {apiJson,ApiError} from '../lib/client/api';
export default function AccountGate({children}:{children:ReactNode}){
 const [user,setUser]=useState<{id:string;email?:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;const channel=new BroadcastChannel('m-chango-auth');channel.onmessage=()=>window.location.replace('/signin');void apiJson<{user:{id:string;email?:string}}>('/api/auth/session',{method:'POST',body:'{}'}).then(r=>{if(alive)setUser(r.user)}).catch(e=>{if(alive)setError(e instanceof ApiError&&e.status===401?'Sign in to manage your fundraisers.':e.message)});return()=>{alive=false;channel.close()}},[]);
 async function logout(){setBusy(true);setError('');try{await apiJson('/api/auth/logout',{method:'POST',body:'{}'});const c=new BroadcastChannel('m-chango-auth');c.postMessage('changed');c.close();window.location.replace('/signin')}catch(e){setUser(null);setError(e instanceof Error?e.message:'Unable to sign out.')}finally{setBusy(false)}}
 if(!user)return <main className="landing"><section className="panel">{error?<><p role="alert">{error}</p><a href="/signin">Sign in</a></>:<p role="status">Checking your account…</p>}</section></main>;
 return <><nav className="section-heading"><a href="/dashboard">My fundraisers</a><span>{user.email}</span><button disabled={busy} onClick={()=>void logout()}>Sign out of all sessions</button></nav>{error&&<p role="alert">{error}</p>}{children}</>;
}
