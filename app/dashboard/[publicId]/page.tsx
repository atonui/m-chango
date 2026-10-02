import AccountLedger from '../../components/account-ledger';
export const dynamic='force-dynamic';
export const metadata={title:'Manage fundraiser · M-Chango',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Page({params}:{params:Promise<{publicId:string}>}){const {publicId}=await params;return <AccountLedger publicId={publicId}/>}
