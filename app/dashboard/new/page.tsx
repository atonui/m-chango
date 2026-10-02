import AccountFundraiserForm from '../../components/account-fundraiser-form';
export const dynamic='force-dynamic';
export default function NewFundraiser(){return <main className="shell"><header className="topbar"><a className="brand" href="/dashboard">M-Chango</a><a href="/dashboard">My fundraisers</a></header><AccountFundraiserForm/></main>}
