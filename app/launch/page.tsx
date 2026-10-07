export const metadata={title:'Launch copy · M-Chango',description:'Copy-ready launch messages for inviting first users to try M-Chango.'};
const firstUser=`I am trying M-Chango for our fundraiser.

It helps us keep one clear contribution list, total and balance, then copy a clean update back into WhatsApp.

Money still goes directly to the organizer's M-Pesa number. M-Chango only helps us record and share the ledger.

Try it here:
https://www.m-chango.com/`;
const organizer=`If you are organizing a fundraiser, M-Chango can help you:

1. Create a fundraiser
2. Record confirmed contributions
3. Import or paste existing lists
4. Copy a WhatsApp-ready update with contributors, total and balance

It does not handle money. Contributions still go directly to your M-Pesa number.

Start here:
https://www.m-chango.com/`;
const feedback=`I am testing M-Chango and would appreciate your feedback.

Please try creating a fundraiser or viewing the sample flow, then tell me:
- Was it clear what to do?
- Would you use this for a real fundraiser?
- What felt confusing or missing?

Link:
https://www.m-chango.com/`;
function CopyBlock({title,text}:{title:string;text:string}){return <section className="panel"><span className="eyebrow">COPY AND PASTE</span><h2>{title}</h2><textarea className="share-copy" readOnly rows={9} value={text}/><p className="field-note">Select the text, copy it and paste into WhatsApp, SMS or email.</p></section>}
export default function Launch(){return <main className="shell help-shell"><header className="topbar"><a className="brand" href="/"><span className="brand-mark">m</span>M-Chango</a><a className="secondary" href="/signin">Get started →</a></header><span className="eyebrow">LAUNCH CONTENT</span><h1 className="heading">Invite first users without overexplaining.</h1><p className="lede">Use these short messages to introduce M-Chango to organizers, WhatsApp groups and early testers. Keep the first ask simple: try it, use it for a real list, and tell us what breaks or feels unclear.</p><div className="notice help-payment"><strong>Best first audience:</strong><p>People already running a fundraiser in WhatsApp. They immediately understand the pain: scattered lists, manual totals and repeated balance updates.</p></div><div className="help-steps"><CopyBlock title="WhatsApp announcement" text={firstUser}/><CopyBlock title="Organizer invitation" text={organizer}/><CopyBlock title="Feedback request" text={feedback}/></div><section className="panel help-faq"><h2>Launch landing copy</h2><p><strong>One-line pitch:</strong> M-Chango helps WhatsApp fundraisers keep a clear contribution ledger and copy clean updates back to the group.</p><p><strong>Trust line:</strong> Money goes directly to the organizer. M-Chango records contributions; it does not collect or transfer funds.</p><p><strong>Best call to action:</strong> Create one fundraiser, add a few real or test contributions, then copy the WhatsApp update.</p></section><section className="help-cta"><h2>Next step</h2><a className="primary" href="/signin">Create a fundraiser →</a><a className="secondary" href="/how-it-works">Read quick start</a></section><footer className="site-footer"><span>M-Chango · Pamoja, made simple.</span><a href="/how-it-works">Quick start</a><a href="/privacy">Privacy policy</a><a href="/">Back to home</a></footer></main>}
