import type { Metadata } from 'next';
import policy from './policy.json';

export const metadata: Metadata = {
  title: 'Privacy policy · M-Chango',
  description: 'How M-Chango collects, uses and protects account, fundraiser and contributor information.',
  alternates: { canonical: 'https://www.m-chango.com/privacy' },
  robots: { index: false, follow: true },
};

export default function PrivacyPolicy() {
  return <main className="shell policy-shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark">m</span>M-Chango</a><a className="secondary" href="/signin">Sign in →</a></header>
    <span className="eyebrow">PRIVACY AND YOUR DATA</span>
    <h1 className="heading">Privacy policy</h1>
    <div className="notice policy-notice"><strong>Some policy details are awaiting confirmation.</strong><p>The marked items below still need to be completed, including the privacy contact and retention details.</p></div>
    {policy.intro.map(text => <p key={text} className="policy-intro">{text}</p>)}
    <nav className="panel policy-contents" aria-label="Privacy policy sections"><h2>On this page</h2><ol>{policy.sections.map(section => <li key={section.id}><a href={'#'+section.id}>{section.title.replace(/^\d+\s/, '')}</a></li>)}</ol></nav>
    <article className="policy-body">{policy.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={section.id+'-title'}><h2 id={section.id+'-title'}>{section.title}</h2>{section.blocks.map((block,index) => block.kind === 'bullet' ? (index === 0 || section.blocks[index-1].kind !== 'bullet' ? <ul key={index}>{section.blocks.slice(index).filter((_,offset)=>section.blocks.slice(index,index+offset+1).every(item=>item.kind==='bullet')).map(item=><li key={item.text}>{item.text}</li>)}</ul> : null) : <p key={index}>{block.text}</p>)}</section>)}</article>
    <footer className="site-footer"><span>M-Chango · Your group, one clear ledger.</span><a href="/">Back to home</a><a href="/how-it-works">How it works</a></footer>
  </main>;
}
