import AccountFundraiserForm from '../../components/account-fundraiser-form';
export const dynamic='force-dynamic';
export default function NewFundraiser(){return <main className="shell form-shell"><header className="topbar"><a className="brand" href="/dashboard"><span className="brand-mark">m</span>M-Chango</a><a className="secondary" href="/dashboard">← My fundraisers</a></header><AccountFundraiserForm/></main>}
